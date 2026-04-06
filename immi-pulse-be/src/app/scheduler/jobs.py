"""
Scheduled jobs — APScheduler configuration.

Jobs:
1. Email Polling: Every 5 minutes — fetch new emails as webhook backup
2. Webhook Renewal: Daily — renew Graph subscriptions
3. SLA Compliance: Every 15 minutes — check P1 response deadlines
4. Compliance Check: Daily at 8am — scan obligations, flag expiring/expired
5. Compliance Report: Weekly Monday 9am — generate portfolio compliance summary
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
            # Check for DB-based connection first
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
                        result = await graph.renew_subscription(mb.subscription_id)
                        logger.info(f"Renewed subscription {mb.subscription_id} for {mb.email}")
                    except Exception as e:
                        logger.warning(f"Failed to renew subscription for {mb.email}: {e}")
        else:
            # Fallback: try to renew all subscriptions the app can see
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


async def _run_sla_check():
    """Job: Check P1 SLA compliance every 15 minutes."""
    try:
        from app.agents.p1_classifier.tracker import check_sla_compliance
        await check_sla_compliance()
    except Exception as e:
        logger.error(f"SLA compliance check failed: {e}", exc_info=True)


async def _run_compliance_check():
    """Job: Daily at 8am — scan obligations, flag expiring within 30/14/7 days or expired."""
    try:
        from sqlalchemy import select

        from app.agents.compliance.models import ComplianceObligation
        from app.agents.shared.models import AgentActivityLog
        from app.db.session import get_async_session

        now = datetime.now(timezone.utc)
        threshold_30d = now + timedelta(days=30)

        async with get_async_session() as db:
            # Find obligations with upcoming or past deadlines
            result = await db.execute(
                select(ComplianceObligation).where(
                    ComplianceObligation.next_due.isnot(None),
                    ComplianceObligation.status.notin_(["non_compliant", "expired"]),
                )
            )
            obligations = result.scalars().all()

            updated = 0
            for ob in obligations:
                old_status = ob.status
                if ob.next_due <= now:
                    ob.status = "expired"
                elif ob.next_due <= threshold_30d:
                    ob.status = "expiring"
                else:
                    continue

                if ob.status != old_status:
                    updated += 1
                    import uuid

                    db.add(AgentActivityLog(
                        id=uuid.uuid4(),
                        agent_name="compliance",
                        action="status_updated",
                        mailbox=ob.mailbox,
                        message_id=ob.source_email_id or "",
                        subject=f"{ob.compliance_type} obligation status: {old_status} → {ob.status}",
                        details={
                            "compliance_type": ob.compliance_type,
                            "old_status": old_status,
                            "new_status": ob.status,
                            "next_due": ob.next_due.isoformat() if ob.next_due else None,
                            "source": "scheduler",
                        },
                    ))

            if updated:
                await db.commit()
                logger.info(f"Compliance check: updated {updated} obligation(s)")

    except Exception as e:
        logger.error(f"Compliance check failed: {e}", exc_info=True)


async def _run_compliance_report():
    """Job: Weekly Monday 9am — generate portfolio compliance summary."""
    try:
        from app.agents.compliance.scorer import calculate_portfolio_summary
        from app.db.session import get_async_session

        async with get_async_session() as db:
            summary = await calculate_portfolio_summary(db)
            logger.info(
                f"Weekly compliance report: score={summary.portfolio_score}%, "
                f"properties={summary.total_properties}, at_risk={summary.properties_at_risk}, "
                f"deadlines={summary.upcoming_deadlines}"
            )
    except Exception as e:
        logger.error(f"Compliance report failed: {e}", exc_info=True)


def start_scheduler() -> AsyncIOScheduler:
    """Configure and start scheduled jobs."""
    scheduler = get_scheduler()

    # 1. Email Polling — every N minutes (default 5)
    scheduler.add_job(
        _run_email_poll,
        trigger=IntervalTrigger(minutes=settings.polling_interval_minutes),
        id="email_poll",
        name="Email Polling (webhook backup)",
        replace_existing=True,
    )

    # 2. Webhook Renewal — daily at midnight
    scheduler.add_job(
        _run_webhook_renewal,
        trigger=CronTrigger(hour=0, minute=0),
        id="webhook_renewal",
        name="Graph Webhook Renewal",
        replace_existing=True,
    )

    # 3. SLA Compliance — every 15 minutes
    scheduler.add_job(
        _run_sla_check,
        trigger=IntervalTrigger(minutes=15),
        id="sla_check",
        name="P1 SLA Compliance Check",
        replace_existing=True,
    )

    # 4. Compliance Check — daily at 8am
    scheduler.add_job(
        _run_compliance_check,
        trigger=CronTrigger(hour=8, minute=0),
        id="compliance_check",
        name="Daily Compliance Check",
        replace_existing=True,
    )

    # 5. Compliance Report — weekly Monday 9am
    scheduler.add_job(
        _run_compliance_report,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="compliance_report",
        name="Weekly Compliance Report",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started: polling every {settings.polling_interval_minutes}min, "
        f"SLA check every 15min, webhook renewal at midnight, "
        f"compliance check daily 8am, compliance report Monday 9am"
    )
    return scheduler


def shutdown_scheduler(scheduler=None):
    """Gracefully shut down the scheduler."""
    s = scheduler or _scheduler
    if s and s.running:
        s.shutdown(wait=False)
        logger.info("Scheduler shut down")
