"""
Scheduled jobs — APScheduler configuration.

Jobs:
1. Email Polling: Every N minutes — fetch new emails as webhook backup
2. Webhook Renewal: Daily — renew Graph subscriptions
"""

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_scheduler = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=settings.timezone)
    return _scheduler


async def _run_email_poll():
    """Job: Poll monitored mailboxes for new emails (backup for webhooks)."""
    try:
        from app.db.session import get_async_session
        from app.integrations.microsoft.connection_service import ConnectionService
        from app.integrations.microsoft.graph_client import get_graph_client
        from app.integrations.microsoft.oauth import get_microsoft_oauth, resolve_tenant_id
        from app.integrations.microsoft.webhooks import dispatch_email

        async with get_async_session() as db:
            mailbox_list = await ConnectionService.get_effective_mailbox_list(db)

        if not mailbox_list:
            return

        # Ensure we have a valid token
        tenant_id = await resolve_tenant_id()
        oauth = get_microsoft_oauth()
        await oauth.get_access_token(tenant_id=tenant_id)

        graph = get_graph_client()
        lookback = settings.polling_lookback_minutes
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=lookback)
        filter_query = f"receivedDateTime ge {cutoff.strftime('%Y-%m-%dT%H:%M:%SZ')}"

        for mailbox in mailbox_list:
            try:
                messages = await graph.list_messages(
                    mailbox,
                    folder="inbox",
                    top=25,
                    filter_query=filter_query,
                    select="id,receivedDateTime",
                )
                processed = 0
                for msg in messages:
                    msg_id = msg.get("id")
                    if not msg_id:
                        continue
                    result = await dispatch_email(mailbox, msg_id, source="poll")
                    if result.get("status") != "skipped":
                        processed += 1

                if processed > 0:
                    logger.info(f"Poll: {mailbox} — {processed} new email(s) processed")
            except Exception as e:
                logger.error(f"Poll failed for {mailbox}: {e}")

    except Exception as e:
        logger.error(f"Email polling job failed: {e}", exc_info=True)


async def _run_webhook_renewal():
    """Job: Renew Graph webhook subscriptions using DB-stored subscription IDs."""
    try:
        from app.db.session import get_async_session
        from app.integrations.microsoft.connection_service import ConnectionService
        from app.integrations.microsoft.graph_client import get_graph_client
        from app.integrations.microsoft.oauth import get_microsoft_oauth

        async with get_async_session() as db:
            connection = await ConnectionService.get_active_connection(db)
            if connection:
                oauth = get_microsoft_oauth()
                await oauth.get_access_token(tenant_id=connection.tenant_id)

            mailboxes = await ConnectionService.get_monitored_mailboxes(db)

        if mailboxes:
            graph = get_graph_client()
            for mb in mailboxes:
                if mb.subscription_id:
                    try:
                        await graph.renew_subscription(mb.subscription_id)
                        logger.info(f"Renewed subscription {mb.subscription_id} for {mb.email}")
                    except Exception as e:
                        logger.warning(f"Failed to renew subscription for {mb.email}: {e}")
        else:
            try:
                graph = get_graph_client()
                subs = await graph.list_subscriptions()
                for sub in subs:
                    try:
                        await graph.renew_subscription(sub["id"])
                        logger.info(f"Renewed subscription {sub['id']}")
                    except Exception as e:
                        logger.warning(f"Failed to renew subscription {sub['id']}: {e}")
            except Exception:
                logger.info("No subscriptions to renew")
    except Exception as e:
        logger.error(f"Webhook renewal failed: {e}", exc_info=True)


def start_scheduler() -> AsyncIOScheduler:
    """Configure and start scheduled jobs."""
    scheduler = get_scheduler()

    scheduler.add_job(
        _run_email_poll,
        trigger=IntervalTrigger(minutes=settings.polling_interval_minutes),
        id="email_poll",
        name="Email Polling (webhook backup)",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_webhook_renewal,
        trigger=CronTrigger(hour=0, minute=0),
        id="webhook_renewal",
        name="Graph Webhook Renewal",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started: polling every {settings.polling_interval_minutes}min, "
        "webhook renewal at midnight"
    )
    return scheduler


def shutdown_scheduler(scheduler=None):
    """Gracefully shut down the scheduler."""
    s = scheduler or _scheduler
    if s and s.running:
        s.shutdown(wait=False)
        logger.info("Scheduler shut down")
