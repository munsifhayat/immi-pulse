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


async def _run_taxonomy_refresh():
    """Job: re-fetch the DHA visa taxonomy and re-seed ``visa_subclasses``.

    Monthly, because the department republishes its processing times roughly
    monthly and the taxonomy itself moves a few times a year. Without this the
    "official" figure beside every community median keeps citing a date that
    recedes into the past while still being presented as current — the most
    quietly dishonest thing this product could do.

    Same broad try/except as its siblings, plus an alert: a refresh that fails
    silently every month is indistinguishable from one that works.
    """
    try:
        from app.agents.immigration.community.refresh import (
            check_cohort_integrity,
            refresh_taxonomy,
        )

        result = await refresh_taxonomy()
        logger.info("Taxonomy refresh complete: %s", result)

        # A taxonomy change is exactly what strands mirror rows, so check right
        # after rather than waiting for someone to notice a cohort went quiet.
        problem = await check_cohort_integrity()
        if problem:
            from app.agents.immigration.community.refresh import _alert

            await _alert("Cohort integrity after taxonomy refresh", problem)
    except Exception as e:
        logger.error(f"Taxonomy refresh failed: {e}", exc_info=True)
        try:
            from app.agents.immigration.community.refresh import _alert

            await _alert(
                "Visa taxonomy refresh failed",
                f"{e}\n\nThe visa list and official processing times are now "
                f"stale. Last good data is untouched — the drift guard keeps it. "
                f"Re-run manually:\n"
                f"  heroku run --app immi-pulse-be "
                f'"PYTHONPATH=src python scripts/fetch_dha_taxonomy.py"\n'
                f"  heroku run --app immi-pulse-be "
                f'"PYTHONPATH=src python scripts/seed_visa_taxonomy.py"',
            )
        except Exception:  # noqa: BLE001
            pass


async def _run_occupation_refresh():
    """Job: re-fetch the DHA skilled occupation list and re-seed ``occupations``.

    Quarterly — the list changes with legislative instruments, not continuously.
    A stale list is worse than an old one here: an occupation removed from the
    CSOL that we still offer sends someone down a path they are no longer
    eligible for.
    """
    try:
        from app.agents.immigration.community.refresh import refresh_occupations

        result = await refresh_occupations()
        logger.info("Occupation refresh complete: %s", result)
    except Exception as e:
        logger.error(f"Occupation refresh failed: {e}", exc_info=True)
        try:
            from app.agents.immigration.community.refresh import _alert

            await _alert(
                "Skilled occupation refresh failed",
                f"{e}\n\nThe occupation picker is serving the last good list, "
                f"which is safe but ageing. Re-run manually:\n"
                f"  heroku run --app immi-pulse-be "
                f'"PYTHONPATH=src python scripts/fetch_dha_occupations.py"\n'
                f"  heroku run --app immi-pulse-be "
                f'"PYTHONPATH=src python scripts/seed_occupations.py"',
            )
        except Exception:  # noqa: BLE001
            pass


def start_scheduler() -> AsyncIOScheduler:
    """Configure and start scheduled jobs.

    Registration is gated on :func:`should_run_scheduled_jobs`. Every job here
    used to be registered unconditionally on every dyno — survivable for a
    five-minute retry loop, not survivable for a rate-limited fetch against a
    government API, where two replicas means two racing requests.
    """
    from app.agents.immigration.community.refresh import should_run_scheduled_jobs

    scheduler = get_scheduler()

    if not should_run_scheduled_jobs():
        logger.info(
            "Scheduler: this process is not the designated job runner "
            "(RUN_SCHEDULED_JOBS / DYNO); no jobs registered."
        )
        return scheduler

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

    # Monthly, on the 3rd. Home Affairs republishes processing times in the
    # first days of a month; the 3rd gives their pipeline room to land rather
    # than fetching the previous month's numbers a few hours early.
    #
    # coalesce + misfire_grace_time because this is the first job here whose
    # schedule is long enough for a dyno restart to skip it entirely — the
    # default would silently drop a missed month.
    scheduler.add_job(
        _run_taxonomy_refresh,
        trigger=CronTrigger(day=3, hour=4, minute=10),
        id="community_taxonomy_refresh",
        name="DHA Visa Taxonomy Refresh (monthly)",
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=6 * 60 * 60,
    )

    # Quarterly, a day later so the two never contend for the same window and a
    # taxonomy failure is legible on its own before this runs.
    scheduler.add_job(
        _run_occupation_refresh,
        trigger=CronTrigger(month="1,4,7,10", day=4, hour=4, minute=40),
        id="community_occupation_refresh",
        name="DHA Skilled Occupation List Refresh (quarterly)",
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=6 * 60 * 60,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started: polling every {settings.polling_interval_minutes}min, "
        "webhook renewal at midnight, triage retry every 5min, "
        "community tier recompute at 03:20, taxonomy refresh monthly on the 3rd, "
        "occupation refresh quarterly on the 4th"
    )
    return scheduler


def shutdown_scheduler(scheduler=None):
    """Gracefully shut down the scheduler."""
    s = scheduler or _scheduler
    if s and s.running:
        s.shutdown(wait=False)
        logger.info("Scheduler shut down")
