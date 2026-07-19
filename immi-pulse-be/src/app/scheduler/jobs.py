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


async def _retry_stuck_triages():
    """Pick up PreCases whose AI triage stalled (pending/running > 5 min) and retry.

    Heroku web dynos restart every 24h. If a PreCase was submitted moments before
    a restart, its triage task gets killed mid-flight. This job resurrects them.
    """
    try:
        from datetime import datetime, timedelta, timezone

        from sqlalchemy import select

        from app.agents.immigration.precases.models import PreCase
        from app.agents.immigration.precases.triage import run_triage_async
        from app.db.session import get_async_session

        threshold = datetime.now(timezone.utc) - timedelta(minutes=5)
        async with get_async_session() as db:
            stuck = (
                await db.execute(
                    select(PreCase).where(
                        PreCase.ai_status.in_(("pending", "running")),
                        PreCase.created_at < threshold,
                    ).limit(20)
                )
            ).scalars().all()
            for pc in stuck:
                # Reset to pending so run_triage will accept it
                pc.ai_status = "pending"
            if stuck:
                await db.commit()
                logger.info(f"Retrying {len(stuck)} stuck triage(s)")
                for pc in stuck:
                    run_triage_async(pc.id)
    except Exception as e:
        logger.error(f"Stuck triage retry failed: {e}", exc_info=True)


async def _run_community_tier_recompute():
    """Job: recompute every community account's trust tier.

    Nightly rather than on every write, because promotion is a function of
    tenure and accumulated behaviour — nothing here changes meaningfully within
    a day, and recomputing on the write path would put four aggregate queries in
    front of every post to answer a question whose answer almost never changes.

    Demotion does not wait for this job: an upheld report recomputes the tier on
    the spot (``trust.record_upheld_report``), because that is the one direction
    where a day's delay has a real cost. This job is the promotion half, plus
    the safety net that catches anything the write paths missed.

    Wrapped in the same broad try/except as its siblings: a scheduler job that
    raises takes the job out of the scheduler, and a trust ladder that silently
    stops recomputing is far worse than one that logs a failure and tries again
    tomorrow.
    """
    try:
        from app.agents.immigration.community.trust import recompute_all_tiers
        from app.db.session import get_async_session

        async with get_async_session() as db:
            result = await recompute_all_tiers(db)
        logger.info(
            "Community tier recompute: %s scanned, %s changed, by_tier=%s",
            result["scanned"],
            result["changed"],
            result["by_tier"],
        )
    except Exception as e:
        logger.error(f"Community tier recompute failed: {e}", exc_info=True)


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

    scheduler.add_job(
        _retry_stuck_triages,
        trigger=IntervalTrigger(minutes=5),
        id="precase_triage_retry",
        name="PreCase Triage Retry (resilience)",
        replace_existing=True,
    )

    # 03:20 rather than on the hour: midnight already has the webhook renewal on
    # it, and two jobs starting together on a single dyno is a self-inflicted
    # contention spike for no benefit. Nothing about a trust ladder cares which
    # hour it runs in.
    scheduler.add_job(
        _run_community_tier_recompute,
        trigger=CronTrigger(hour=3, minute=20),
        id="community_tier_recompute",
        name="Community Trust Tier Recompute",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started: polling every {settings.polling_interval_minutes}min, "
        "webhook renewal at midnight, triage retry every 5min, "
        "community tier recompute at 03:20"
    )
    return scheduler


def shutdown_scheduler(scheduler=None):
    """Gracefully shut down the scheduler."""
    s = scheduler or _scheduler
    if s and s.running:
        s.shutdown(wait=False)
        logger.info("Scheduler shut down")
