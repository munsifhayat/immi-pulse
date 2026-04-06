"""Pydantic schemas for Microsoft integration API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AddMailboxRequest(BaseModel):
    email: str


class MonitoredMailboxOut(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    is_active: bool
    subscription_id: Optional[str] = None
    subscription_expiry: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MicrosoftStatusOut(BaseModel):
    connected: bool
    token_healthy: bool
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    active_subscriptions: int = 0
    monitored_mailboxes: list[str] = []
    excluded_mailboxes: list[str] = []
    app_configured: bool = False
    reason: Optional[str] = None
    permission_error: Optional[str] = None
    needs_reauth: bool = False
