"""Service layer for Microsoft connections and monitored mailboxes."""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.integrations.microsoft.models import MicrosoftConnection, MonitoredMailbox

logger = logging.getLogger(__name__)
settings = get_settings()


class ConnectionService:

    @staticmethod
    async def get_active_connection(db: AsyncSession) -> Optional[MicrosoftConnection]:
        result = await db.execute(
            select(MicrosoftConnection).where(MicrosoftConnection.status == "active")
        )
        return result.scalars().first()

    @staticmethod
    async def create_connection(
        db: AsyncSession, tenant_id: str, tenant_name: Optional[str] = None, connected_by: Optional[str] = None
    ) -> MicrosoftConnection:
        # Deactivate any existing active connection
        await db.execute(
            update(MicrosoftConnection)
            .where(MicrosoftConnection.status == "active")
            .values(status="disconnected", disconnected_at=datetime.now(timezone.utc))
        )

        connection = MicrosoftConnection(
            tenant_id=tenant_id,
            tenant_name=tenant_name,
            connected_by=connected_by,
            status="active",
            connected_at=datetime.now(timezone.utc),
        )
        db.add(connection)
        await db.commit()
        await db.refresh(connection)
        return connection

    @staticmethod
    async def disconnect(db: AsyncSession, connection_id) -> None:
        await db.execute(
            update(MicrosoftConnection)
            .where(MicrosoftConnection.id == connection_id)
            .values(status="disconnected", disconnected_at=datetime.now(timezone.utc))
        )
        # Deactivate all mailboxes for this connection
        await db.execute(
            update(MonitoredMailbox)
            .where(MonitoredMailbox.connection_id == connection_id)
            .values(is_active=False)
        )
        await db.commit()

    @staticmethod
    async def store_oauth_state(db: AsyncSession, state: str) -> MicrosoftConnection:
        """Create a pending connection row to store the CSRF state token."""
        connection = MicrosoftConnection(
            tenant_id="pending",
            oauth_state=state,
            status="pending",
        )
        db.add(connection)
        await db.commit()
        await db.refresh(connection)
        return connection

    @staticmethod
    async def validate_oauth_state(db: AsyncSession, state: str) -> Optional[MicrosoftConnection]:
        """Validate and consume the OAuth state token. Returns the pending connection if valid."""
        result = await db.execute(
            select(MicrosoftConnection).where(
                MicrosoftConnection.oauth_state == state,
                MicrosoftConnection.status == "pending",
            )
        )
        connection = result.scalars().first()
        if connection:
            connection.oauth_state = None  # Consume the state
            await db.commit()
        return connection

    @staticmethod
    async def get_monitored_mailboxes(db: AsyncSession) -> list[MonitoredMailbox]:
        result = await db.execute(
            select(MonitoredMailbox).where(MonitoredMailbox.is_active == True)  # noqa: E712
        )
        return list(result.scalars().all())

    @staticmethod
    async def set_monitored_mailboxes(
        db: AsyncSession, connection_id, emails: list[str]
    ) -> list[MonitoredMailbox]:
        """Upsert mailbox list — deactivate removed, add new, keep existing."""
        emails_lower = [e.strip().lower() for e in emails]

        # Get ALL existing mailboxes by email (not just this connection)
        # to handle re-connections where the email already exists
        result = await db.execute(
            select(MonitoredMailbox).where(MonitoredMailbox.email.in_(emails_lower))
        )
        existing_by_email = {mb.email.lower(): mb for mb in result.scalars().all()}

        # Get mailboxes for this connection (to deactivate removed ones)
        result = await db.execute(
            select(MonitoredMailbox).where(MonitoredMailbox.connection_id == connection_id)
        )
        connection_mailboxes = {mb.email.lower(): mb for mb in result.scalars().all()}

        # Deactivate mailboxes no longer in the list
        for email, mb in connection_mailboxes.items():
            if email not in emails_lower:
                mb.is_active = False

        # Add or reactivate mailboxes in the list
        for email in emails_lower:
            if email in existing_by_email:
                # Reassign to current connection and reactivate
                mb = existing_by_email[email]
                mb.connection_id = connection_id
                mb.is_active = True
            else:
                db.add(MonitoredMailbox(
                    connection_id=connection_id,
                    email=email,
                    is_active=True,
                ))

        await db.commit()

        # Return the updated list
        result = await db.execute(
            select(MonitoredMailbox).where(
                MonitoredMailbox.connection_id == connection_id,
                MonitoredMailbox.is_active == True,  # noqa: E712
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_subscription(
        db: AsyncSession, mailbox_id, subscription_id: str, expiry: Optional[datetime] = None
    ) -> None:
        await db.execute(
            update(MonitoredMailbox)
            .where(MonitoredMailbox.id == mailbox_id)
            .values(subscription_id=subscription_id, subscription_expiry=expiry)
        )
        await db.commit()

    @staticmethod
    async def get_or_create_connection(db: AsyncSession) -> MicrosoftConnection:
        """Get active connection or create one from env vars."""
        connection = await ConnectionService.get_active_connection(db)
        if connection:
            return connection

        # Auto-create from environment variables
        tenant_id = settings.microsoft_tenant_id
        if not tenant_id:
            raise ValueError("No active connection and MICROSOFT_TENANT_ID not set")

        return await ConnectionService.create_connection(db, tenant_id=tenant_id)

    @staticmethod
    async def get_mailbox_by_email(db: AsyncSession, email: str) -> Optional[MonitoredMailbox]:
        result = await db.execute(
            select(MonitoredMailbox).where(MonitoredMailbox.email == email.lower())
        )
        return result.scalars().first()

    @staticmethod
    async def get_mailbox_by_id(db: AsyncSession, mailbox_id) -> Optional[MonitoredMailbox]:
        result = await db.execute(
            select(MonitoredMailbox).where(MonitoredMailbox.id == mailbox_id)
        )
        return result.scalars().first()

    @staticmethod
    async def add_mailbox(db: AsyncSession, connection_id, email: str) -> MonitoredMailbox:
        """Add a mailbox or reactivate an existing one."""
        email_lower = email.strip().lower()
        existing = await ConnectionService.get_mailbox_by_email(db, email_lower)
        if existing:
            existing.connection_id = connection_id
            existing.is_active = True
            await db.commit()
            await db.refresh(existing)
            return existing

        mailbox = MonitoredMailbox(
            connection_id=connection_id,
            email=email_lower,
            is_active=True,
        )
        db.add(mailbox)
        await db.commit()
        await db.refresh(mailbox)
        return mailbox

    @staticmethod
    async def deactivate_mailbox(db: AsyncSession, mailbox_id) -> None:
        await db.execute(
            update(MonitoredMailbox)
            .where(MonitoredMailbox.id == mailbox_id)
            .values(is_active=False, subscription_id=None, subscription_expiry=None)
        )
        await db.commit()

    @staticmethod
    async def get_effective_mailbox_list(db: AsyncSession) -> list[str]:
        """Return active mailboxes from DB, falling back to env var."""
        db_mailboxes = await ConnectionService.get_monitored_mailboxes(db)
        if db_mailboxes:
            return [mb.email.lower() for mb in db_mailboxes]
        return settings.monitored_mailbox_list
