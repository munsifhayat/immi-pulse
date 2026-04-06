"""
Microsoft Azure AD OAuth — Client Credentials Flow.
No user login required. App-level access to all mailboxes in tenant.
Supports dynamic tenant_id for self-service onboarding.
"""

import logging
import time
from typing import Optional
from urllib.parse import urlencode

import msal

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class MicrosoftOAuth:
    """Manages Azure AD client credentials token lifecycle."""

    SCOPES = ["https://graph.microsoft.com/.default"]

    def __init__(self):
        self._app: Optional[msal.ConfidentialClientApplication] = None
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0
        self._current_tenant_id: Optional[str] = None

    def _get_app(self, tenant_id: Optional[str] = None) -> msal.ConfidentialClientApplication:
        effective_tenant = tenant_id or settings.microsoft_tenant_id
        if not effective_tenant:
            raise ValueError("No tenant_id available — connect via OAuth or set MICROSOFT_TENANT_ID")

        # Invalidate cached app if tenant changed
        if self._app is not None and self._current_tenant_id != effective_tenant:
            logger.info(f"Tenant changed from {self._current_tenant_id} to {effective_tenant}, recreating MSAL app")
            self._app = None
            self._cached_token = None
            self._token_expires_at = 0

        if self._app is None:
            if not settings.microsoft_app_configured:
                raise ValueError("Microsoft OAuth not configured — missing client_id or client_secret")
            self._app = msal.ConfidentialClientApplication(
                client_id=settings.microsoft_client_id,
                client_credential=settings.microsoft_client_secret,
                authority=f"https://login.microsoftonline.com/{effective_tenant}",
            )
            self._current_tenant_id = effective_tenant

        return self._app

    async def get_access_token(self, tenant_id: Optional[str] = None) -> str:
        """Get a valid access token, refreshing if needed."""
        effective_tenant = tenant_id or settings.microsoft_tenant_id

        # If tenant differs from cached, force refresh
        if effective_tenant != self._current_tenant_id:
            self._cached_token = None
            self._token_expires_at = 0

        if self._cached_token and time.time() < self._token_expires_at - 300:
            return self._cached_token

        app = self._get_app(tenant_id=effective_tenant)
        result = app.acquire_token_for_client(scopes=self.SCOPES)

        if "access_token" not in result:
            error = result.get("error_description", result.get("error", "Unknown error"))
            logger.error(f"Microsoft OAuth token acquisition failed: {error}")
            raise ValueError(f"Failed to acquire Microsoft token: {error}")

        self._cached_token = result["access_token"]
        self._token_expires_at = time.time() + result.get("expires_in", 3600)
        logger.info("Microsoft OAuth: Token acquired/refreshed successfully")
        return self._cached_token

    @property
    def is_configured(self) -> bool:
        return settings.microsoft_configured

    @property
    def is_app_configured(self) -> bool:
        return settings.microsoft_app_configured

    @staticmethod
    def get_admin_consent_url(redirect_uri: str, state: str) -> str:
        """Build the Microsoft admin consent URL for the OAuth flow."""
        params = {
            "client_id": settings.microsoft_client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "https://graph.microsoft.com/.default",
        }
        return f"https://login.microsoftonline.com/common/adminconsent?{urlencode(params)}"


_microsoft_oauth: Optional[MicrosoftOAuth] = None


def get_microsoft_oauth() -> MicrosoftOAuth:
    global _microsoft_oauth
    if _microsoft_oauth is None:
        _microsoft_oauth = MicrosoftOAuth()
    return _microsoft_oauth


# --- Tenant resolution helper (env var → DB fallback, cached 60s) ---

_cached_tenant_id: Optional[str] = None
_cached_tenant_ts: float = 0
_TENANT_CACHE_TTL = 60  # seconds


async def resolve_tenant_id() -> str:
    """Resolve tenant_id: env var first, then active DB connection, cached 60s."""
    global _cached_tenant_id, _cached_tenant_ts

    # 1. Env var always wins (no caching needed)
    if settings.microsoft_tenant_id:
        return settings.microsoft_tenant_id

    # 2. Return cached DB value if fresh
    if _cached_tenant_id and (time.time() - _cached_tenant_ts) < _TENANT_CACHE_TTL:
        return _cached_tenant_id

    # 3. Look up from DB (lazy imports to avoid circular deps)
    from app.db.session import get_async_session
    from app.integrations.microsoft.connection_service import ConnectionService

    async with get_async_session() as db:
        connection = await ConnectionService.get_active_connection(db)

    if connection and connection.tenant_id and connection.tenant_id != "pending":
        _cached_tenant_id = connection.tenant_id
        _cached_tenant_ts = time.time()
        return _cached_tenant_id

    raise ValueError("No tenant_id available — connect via OAuth or set MICROSOFT_TENANT_ID")
