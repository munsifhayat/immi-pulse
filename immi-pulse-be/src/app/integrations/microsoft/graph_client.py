"""
Microsoft Graph API Client.
Handles email operations, folder management, attachments, and webhooks.
"""

import logging
from typing import Optional

import httpx

from app.integrations.microsoft.oauth import get_microsoft_oauth, resolve_tenant_id

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class MicrosoftGraphClient:
    """Async wrapper around Microsoft Graph API v1.0."""

    def __init__(self):
        self._oauth = get_microsoft_oauth()

    async def _get_headers(self) -> dict:
        tenant_id = await resolve_tenant_id()
        token = await self._oauth.get_access_token(tenant_id=tenant_id)
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        url: str,
        json: Optional[dict] = None,
        params: Optional[dict] = None,
    ) -> dict:
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method, url=url, headers=headers, json=json, params=params
            )
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "60"))
                logger.warning(f"Graph API rate limited. Retry after {retry_after}s")
                raise Exception(f"Rate limited. Retry after {retry_after}s")
            if response.status_code >= 400:
                logger.error(f"Graph API {method} {url} → {response.status_code}: {response.text}")
            response.raise_for_status()
            if response.status_code == 204:
                return {}
            return response.json()

    # --- Tenant / User Discovery ---

    async def list_users(self) -> list[dict]:
        """List users with mail addresses in the tenant."""
        url = f"{GRAPH_BASE}/users"
        params = {
            "$select": "mail,displayName,userPrincipalName",
            "$top": 100,
        }
        result = await self._request("GET", url, params=params)
        return [u for u in result.get("value", []) if u.get("mail")]

    async def get_organization(self) -> Optional[dict]:
        """Get tenant organization info (display name, etc.)."""
        url = f"{GRAPH_BASE}/organization"
        result = await self._request("GET", url)
        orgs = result.get("value", [])
        return orgs[0] if orgs else None

    # --- Email Operations ---

    async def list_messages(
        self,
        mailbox: str,
        folder: str = "inbox",
        top: int = 50,
        filter_query: Optional[str] = None,
        select: Optional[str] = None,
    ) -> list[dict]:
        url = f"{GRAPH_BASE}/users/{mailbox}/mailFolders/{folder}/messages"
        params = {"$top": top, "$orderby": "receivedDateTime desc"}
        if filter_query:
            params["$filter"] = filter_query
        if select:
            params["$select"] = select
        result = await self._request("GET", url, params=params)
        return result.get("value", [])

    async def get_message(self, mailbox: str, message_id: str) -> dict:
        url = f"{GRAPH_BASE}/users/{mailbox}/messages/{message_id}"
        return await self._request("GET", url)

    async def move_message(
        self, mailbox: str, message_id: str, destination_folder_id: str
    ) -> dict:
        url = f"{GRAPH_BASE}/users/{mailbox}/messages/{message_id}/move"
        return await self._request("POST", url, json={"destinationId": destination_folder_id})

    async def get_message_attachments(self, mailbox: str, message_id: str) -> list[dict]:
        url = f"{GRAPH_BASE}/users/{mailbox}/messages/{message_id}/attachments"
        result = await self._request("GET", url)
        return result.get("value", [])

    async def download_attachment(
        self, mailbox: str, message_id: str, attachment_id: str
    ) -> dict:
        url = f"{GRAPH_BASE}/users/{mailbox}/messages/{message_id}/attachments/{attachment_id}"
        return await self._request("GET", url)

    # --- Folder Operations ---

    async def list_folders(self, mailbox: str) -> list[dict]:
        url = f"{GRAPH_BASE}/users/{mailbox}/mailFolders"
        params = {"$top": 100}
        result = await self._request("GET", url, params=params)
        return result.get("value", [])

    async def get_folder_by_name(self, mailbox: str, name: str) -> Optional[dict]:
        folders = await self.list_folders(mailbox)
        for folder in folders:
            if folder.get("displayName", "").lower() == name.lower():
                return folder
        return None

    async def create_folder(self, mailbox: str, name: str) -> dict:
        url = f"{GRAPH_BASE}/users/{mailbox}/mailFolders"
        return await self._request("POST", url, json={"displayName": name})

    # --- Subscription (Webhooks) ---

    async def list_subscriptions(self) -> list[dict]:
        """List all active Graph webhook subscriptions."""
        url = f"{GRAPH_BASE}/subscriptions"
        result = await self._request("GET", url)
        return result.get("value", [])

    async def create_subscription(
        self,
        mailbox: str,
        notification_url: str,
        client_state: str = "pp-webhook",
    ) -> dict:
        url = f"{GRAPH_BASE}/subscriptions"
        payload = {
            "changeType": "created",
            "notificationUrl": notification_url,
            "resource": f"users/{mailbox}/messages",
            "expirationDateTime": self._get_expiration(),
            "clientState": client_state,
        }
        return await self._request("POST", url, json=payload)

    async def renew_subscription(self, subscription_id: str) -> dict:
        url = f"{GRAPH_BASE}/subscriptions/{subscription_id}"
        return await self._request(
            "PATCH", url, json={"expirationDateTime": self._get_expiration()}
        )

    async def delete_subscription(self, subscription_id: str) -> dict:
        url = f"{GRAPH_BASE}/subscriptions/{subscription_id}"
        return await self._request("DELETE", url)

    # --- Message Creation (for E2E testing) ---

    async def create_message_in_inbox(
        self,
        mailbox: str,
        subject: str,
        body: str,
        from_name: str = "Test Sender",
        from_email: str = "test-sender@example.com",
        body_content_type: str = "HTML",
    ) -> dict:
        """Create a message directly in a mailbox's inbox folder via Graph API.

        This triggers webhook notifications just like a real incoming email,
        enabling true end-to-end testing of the full processing pipeline.
        """
        url = f"{GRAPH_BASE}/users/{mailbox}/mailFolders/inbox/messages"
        payload = {
            "subject": subject,
            "body": {"contentType": body_content_type, "content": body},
            "from": {"emailAddress": {"name": from_name, "address": from_email}},
            "sender": {"emailAddress": {"name": from_name, "address": from_email}},
            "isRead": False,
            "receivedDateTime": self._utc_now(),
        }
        return await self._request("POST", url, json=payload)

    def _utc_now(self) -> str:
        from datetime import datetime, timezone

        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # --- Thread Operations ---

    async def get_conversation_thread(
        self, mailbox: str, conversation_id: str
    ) -> list[dict]:
        url = f"{GRAPH_BASE}/users/{mailbox}/messages"
        params = {
            "$filter": f"conversationId eq '{conversation_id}'",
            "$orderby": "receivedDateTime asc",
            "$top": 50,
        }
        result = await self._request("GET", url, params=params)
        return result.get("value", [])

    def _get_expiration(self) -> str:
        """Graph subscriptions for messages expire in max 4230 minutes (~3 days)."""
        from datetime import datetime, timedelta, timezone

        expiry = datetime.now(timezone.utc) + timedelta(minutes=4200)
        return expiry.strftime("%Y-%m-%dT%H:%M:%S.0000000Z")


_graph_client: Optional[MicrosoftGraphClient] = None


def get_graph_client() -> MicrosoftGraphClient:
    global _graph_client
    if _graph_client is None:
        _graph_client = MicrosoftGraphClient()
    return _graph_client
