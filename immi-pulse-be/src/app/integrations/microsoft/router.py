"""
Microsoft Integration API endpoints.
Handles connection status, mailbox management, webhook setup,
and incoming Graph notifications.
"""

import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.microsoft.connection_service import ConnectionService
from app.integrations.microsoft.graph_client import get_graph_client
from app.integrations.microsoft.models import MicrosoftConnection
from app.integrations.microsoft.oauth import get_microsoft_oauth, resolve_tenant_id
from app.integrations.microsoft.schemas import (
    AddMailboxRequest,
    MicrosoftStatusOut,
    MonitoredMailboxOut,
)
from app.integrations.microsoft.webhooks import dispatch_email

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/integrations/microsoft", tags=["Microsoft Integration"])


# --- Status ---


@router.get("/status", response_model=MicrosoftStatusOut)
async def integration_status(db: AsyncSession = Depends(get_db)):
    """Check Microsoft 365 connection status."""
    if not settings.microsoft_app_configured:
        return MicrosoftStatusOut(
            connected=False,
            token_healthy=False,
            app_configured=False,
            reason="Microsoft credentials not configured (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET).",
        )

    oauth = get_microsoft_oauth()

    # Resolve tenant: env var → active DB connection
    tenant_id = None
    try:
        tenant_id = await resolve_tenant_id()
    except ValueError:
        # No tenant configured yet — show "Not Connected" with Authorize button
        return MicrosoftStatusOut(
            connected=False,
            token_healthy=False,
            app_configured=True,
            reason="No tenant connected. Click Authorize to connect a Microsoft 365 tenant.",
        )

    # Check token health
    token_healthy = False
    try:
        token = await oauth.get_access_token(tenant_id=tenant_id)
        token_healthy = bool(token)
    except Exception as e:
        return MicrosoftStatusOut(
            connected=False,
            token_healthy=False,
            tenant_id=tenant_id,
            app_configured=True,
            reason=str(e),
        )

    # Get tenant name
    tenant_name = None
    active_subscriptions = 0
    permission_error = None
    needs_reauth = False
    try:
        graph = get_graph_client()
        org = await graph.get_organization()
        if org:
            tenant_name = org.get("displayName")
        subs = await graph.list_subscriptions()
        active_subscriptions = len(subs)
    except Exception:
        pass

    # Get mailboxes from DB
    db_mailboxes = await ConnectionService.get_monitored_mailboxes(db)
    mailbox_emails = [mb.email for mb in db_mailboxes] if db_mailboxes else settings.monitored_mailbox_list

    # Test actual Mail.Read permission on the first mailbox
    if token_healthy and mailbox_emails:
        try:
            graph = get_graph_client()
            await graph.list_messages(mailbox_emails[0], top=1, select="id")
        except Exception as e:
            error_str = str(e)
            if "403" in error_str or "AccessDenied" in error_str:
                permission_error = (
                    "Mail.Read permission denied. The app needs admin consent "
                    "to read emails from this tenant's mailboxes."
                )
                needs_reauth = True
                logger.warning(f"Permission test failed for {mailbox_emails[0]}: {e}")

    return MicrosoftStatusOut(
        connected=token_healthy and not needs_reauth,
        token_healthy=token_healthy,
        tenant_id=tenant_id,
        tenant_name=tenant_name,
        active_subscriptions=active_subscriptions,
        monitored_mailboxes=mailbox_emails,
        excluded_mailboxes=settings.excluded_mailbox_list,
        app_configured=True,
        permission_error=permission_error,
        needs_reauth=needs_reauth,
    )


# --- Admin Consent (Re-authorization) ---


@router.get("/consent-url")
async def get_consent_url(db: AsyncSession = Depends(get_db)):
    """Generate the Microsoft admin consent URL for granting app permissions."""
    if not settings.microsoft_app_configured:
        raise HTTPException(400, "Microsoft app credentials not configured")

    # Build the callback URL
    base_url = settings.public_webhook_base_url
    if not base_url:
        raise HTTPException(400, "PUBLIC_WEBHOOK_BASE_URL not configured")

    redirect_uri = f"{base_url}{settings.api_v1_prefix}/integrations/microsoft/callback"

    # Generate and store CSRF state
    state = secrets.token_urlsafe(32)
    await ConnectionService.store_oauth_state(db, state)

    oauth = get_microsoft_oauth()
    consent_url = oauth.get_admin_consent_url(redirect_uri=redirect_uri, state=state)

    logger.info(f"Admin consent URL generated, redirect_uri={redirect_uri}")
    return {"consent_url": consent_url, "redirect_uri": redirect_uri}


@router.get("/callback")
async def consent_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Microsoft admin consent callback. Redirects to frontend settings page."""
    admin_consent = request.query_params.get("admin_consent", "").lower()
    tenant = request.query_params.get("tenant", "")
    state = request.query_params.get("state", "")
    error = request.query_params.get("error")
    error_description = request.query_params.get("error_description", "")

    frontend_url = settings.frontend_url.rstrip("/")

    if error:
        logger.error(f"Admin consent failed: {error} — {error_description}")
        return RedirectResponse(
            url=f"{frontend_url}/dashboard/settings?consent=error&reason={error_description}"
        )

    if admin_consent != "true" or not tenant:
        logger.warning(f"Admin consent not granted or missing tenant. consent={admin_consent}, tenant={tenant}")
        return RedirectResponse(
            url=f"{frontend_url}/dashboard/settings?consent=denied"
        )

    # Validate CSRF state
    if state:
        valid = await ConnectionService.validate_oauth_state(db, state)
        if not valid:
            logger.warning("Invalid or expired OAuth state token")
            # Continue anyway — state mismatch is non-fatal for admin consent

    # Create or update the active connection with the consented tenant
    connection = await ConnectionService.get_active_connection(db)
    if connection:
        # Update existing connection's tenant if it changed
        if connection.tenant_id != tenant:
            connection.tenant_id = tenant
            connection.connected_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Updated connection tenant to {tenant}")
    else:
        connection = await ConnectionService.create_connection(
            db, tenant_id=tenant, connected_by="admin_consent"
        )
        logger.info(f"Created new connection for tenant {tenant}")

    # Invalidate cached OAuth token so next call uses new consent
    oauth = get_microsoft_oauth()
    oauth._cached_token = None
    oauth._token_expires_at = 0
    oauth._app = None
    oauth._current_tenant_id = None

    logger.info(f"Admin consent granted for tenant {tenant}")
    return RedirectResponse(
        url=f"{frontend_url}/dashboard/settings?consent=success&tenant={tenant}"
    )


# --- Disconnect ---


@router.post("/disconnect")
async def disconnect_tenant(db: AsyncSession = Depends(get_db)):
    """Disconnect the current Microsoft 365 tenant. Cleans up webhooks and resets state."""
    connection = await ConnectionService.get_active_connection(db)
    if not connection:
        raise HTTPException(400, "No active Microsoft connection to disconnect")

    # Delete webhook subscriptions for all active mailboxes
    mailboxes = await ConnectionService.get_monitored_mailboxes(db)
    graph = get_graph_client()
    for mb in mailboxes:
        if mb.subscription_id:
            try:
                await graph.delete_subscription(mb.subscription_id)
                logger.info(f"Deleted webhook subscription for {mb.email}")
            except Exception as e:
                logger.warning(f"Failed to delete subscription for {mb.email}: {e}")

    tenant_id = connection.tenant_id
    await ConnectionService.disconnect(db, connection.id)

    # Invalidate cached OAuth token
    oauth = get_microsoft_oauth()
    oauth._cached_token = None
    oauth._token_expires_at = 0
    oauth._app = None
    oauth._current_tenant_id = None

    # Clean up stale pending connections
    from sqlalchemy import delete
    await db.execute(
        delete(MicrosoftConnection).where(MicrosoftConnection.status == "pending")
    )
    await db.commit()

    logger.info(f"Disconnected from tenant {tenant_id}")
    return {"status": "disconnected", "tenant_id": tenant_id}


# --- Mailbox Management ---


@router.get("/mailboxes/active", response_model=list[MonitoredMailboxOut])
async def get_active_mailboxes(db: AsyncSession = Depends(get_db)):
    """Return currently monitored mailboxes from DB."""
    mailboxes = await ConnectionService.get_monitored_mailboxes(db)
    return [
        MonitoredMailboxOut(
            id=str(mb.id),
            email=mb.email,
            display_name=mb.display_name,
            is_active=mb.is_active,
            subscription_id=mb.subscription_id,
            subscription_expiry=mb.subscription_expiry,
        )
        for mb in mailboxes
    ]


@router.post("/mailboxes/add", response_model=MonitoredMailboxOut)
async def add_mailbox(body: AddMailboxRequest, db: AsyncSession = Depends(get_db)):
    """Add a mailbox to monitoring. Creates webhook subscription automatically."""
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email address")

    # Check if already monitored
    existing = await ConnectionService.get_mailbox_by_email(db, email)
    if existing and existing.is_active:
        raise HTTPException(409, f"Mailbox {email} is already being monitored")

    # Ensure we have a connection record
    connection = await ConnectionService.get_or_create_connection(db)

    # Add mailbox
    mailbox = await ConnectionService.add_mailbox(db, connection.id, email)

    # Create webhook subscription
    if settings.public_webhook_base_url:
        try:
            oauth = get_microsoft_oauth()
            await oauth.get_access_token(tenant_id=connection.tenant_id)
            graph = get_graph_client()
            notification_url = f"{settings.public_webhook_base_url}{settings.api_v1_prefix}/webhooks/outlook"
            sub = await graph.create_subscription(email, notification_url)
            sub_id = sub.get("id")
            expiry_str = sub.get("expirationDateTime")
            expiry = None
            if expiry_str:
                expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
            await ConnectionService.update_subscription(db, mailbox.id, sub_id, expiry)
            mailbox.subscription_id = sub_id
            mailbox.subscription_expiry = expiry
            logger.info(f"Webhook subscription created for {email}: {sub_id}")
        except Exception as e:
            logger.error(f"Webhook creation failed for {email}: {e}")
            # Mailbox is still added, just without webhook — polling will pick up emails

    return MonitoredMailboxOut(
        id=str(mailbox.id),
        email=mailbox.email,
        display_name=mailbox.display_name,
        is_active=mailbox.is_active,
        subscription_id=mailbox.subscription_id,
        subscription_expiry=mailbox.subscription_expiry,
    )


@router.delete("/mailboxes/{mailbox_id}")
async def remove_mailbox(mailbox_id: str, db: AsyncSession = Depends(get_db)):
    """Remove a mailbox from monitoring. Deletes webhook subscription."""
    mailbox = await ConnectionService.get_mailbox_by_id(db, mailbox_id)
    if not mailbox:
        raise HTTPException(404, "Mailbox not found")

    # Delete webhook subscription if exists
    if mailbox.subscription_id:
        try:
            graph = get_graph_client()
            await graph.delete_subscription(mailbox.subscription_id)
            logger.info(f"Deleted webhook subscription for {mailbox.email}")
        except Exception as e:
            logger.warning(f"Failed to delete subscription for {mailbox.email}: {e}")

    # Deactivate in DB
    await ConnectionService.deactivate_mailbox(db, mailbox.id)
    return {"status": "removed", "email": mailbox.email}


# --- Webhook Setup ---


@router.post("/webhooks/setup")
async def setup_webhooks(db: AsyncSession = Depends(get_db)):
    """Recreate Graph subscriptions for all monitored mailboxes."""
    if not settings.public_webhook_base_url:
        return {"error": "PUBLIC_WEBHOOK_BASE_URL not configured"}

    mailbox_list = await ConnectionService.get_effective_mailbox_list(db)
    if not mailbox_list:
        return {"error": "No monitored mailboxes configured"}

    # Ensure token
    try:
        tenant_id = await resolve_tenant_id()
        oauth = get_microsoft_oauth()
        await oauth.get_access_token(tenant_id=tenant_id)
    except Exception as e:
        return {"error": f"Token error: {e}"}

    graph = get_graph_client()
    notification_url = f"{settings.public_webhook_base_url}{settings.api_v1_prefix}/webhooks/outlook"

    results = {}
    for mailbox in mailbox_list:
        try:
            sub = await graph.create_subscription(mailbox, notification_url)
            results[mailbox] = {"status": "ok", "subscription_id": sub.get("id")}
            logger.info(f"Webhook subscription created for {mailbox}")
        except Exception as e:
            results[mailbox] = {"status": "error", "error": str(e)}
            logger.error(f"Failed to create webhook for {mailbox}: {e}")

    return {"results": results}


# --- Webhook receiver (public — no API key required) ---

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@webhook_router.post("/outlook")
async def receive_outlook_notification(request: Request):
    """
    Receive Microsoft Graph change notifications.
    Handles both validation requests and actual notifications.
    """
    # Graph sends a validation token on subscription creation
    validation_token = request.query_params.get("validationToken")
    if validation_token:
        logger.info("Graph webhook validation request received")
        return Response(content=validation_token, media_type="text/plain")

    # Process change notifications
    body = await request.json()
    notifications = body.get("value", [])
    logger.info(f"Webhook received {len(notifications)} notification(s)")

    # Get effective mailbox list from DB (with env var fallback)
    from app.db.session import get_async_session

    async with get_async_session() as db:
        monitored = await ConnectionService.get_effective_mailbox_list(db)

    for notification in notifications:
        resource = notification.get("resource", "")
        change_type = notification.get("changeType", "")
        logger.info(f"Notification: changeType={change_type}, resource={resource}")

        # resource format: "Users/{user_id_or_email}/Messages/{message_id}"
        parts = resource.split("/")
        if len(parts) >= 4 and parts[2].lower() == "messages":
            user_identifier = parts[1]
            message_id = parts[3]

            # Resolve which mailbox to use for Graph API calls
            if "@" in user_identifier:
                mailbox = user_identifier.lower()
            elif monitored:
                mailbox = monitored[0]
                logger.info(f"Graph sent user GUID {user_identifier}, using monitored mailbox: {mailbox}")
            else:
                logger.warning("No monitored mailboxes configured, cannot process notification")
                continue

            if mailbox not in monitored:
                logger.info(f"Skipping unmonitored mailbox: {mailbox} (monitored: {monitored})")
                continue

            logger.info(f"Processing email: {mailbox} / {message_id}")
            try:
                await dispatch_email(mailbox, message_id, source="webhook")
            except Exception as e:
                logger.error(f"Dispatch failed for {mailbox}/{message_id}: {e}")
        else:
            logger.info(f"Skipping notification with unexpected resource format: {resource}")

    return {"status": "ok"}


@webhook_router.post("/outlook/lifecycle")
async def outlook_lifecycle(request: Request):
    """Handle Graph subscription lifecycle events (reauthorization, etc.)."""
    body = await request.json()
    logger.info(f"Graph lifecycle event: {body}")
    return {"status": "ok"}
