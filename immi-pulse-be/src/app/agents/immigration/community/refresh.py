"""Scheduled refresh of the two Home Affairs datasets, with a drift guard.

The taxonomy is **not** static — MATES and PALM streams are recent additions and
the 858 split (Global Talent → National Innovation) is mid-transition. The
occupation list moves with legislative instruments. Left alone, both datasets
rot quietly: the visa picker keeps offering a retired stream, and the "official"
figures beside every community median keep citing a date that recedes into the
past while still being presented as current.

Three things make this safe to run unattended.

**One runner.** ``should_run_scheduled_jobs()`` gates registration. Every job in
this app has been registered unconditionally on every dyno, which is survivable
for a five-minute retry loop and is not survivable for an Akamai-rate-limited
fetch against a government API — two dynos means two fetches racing, and the
department is entitled to treat that as abuse.

**A drift guard.** Enforced inside the seeders (so the CLI is protected too), not
here. A blocked fetch yields a *valid* snapshot with too few rows in it, and an
unguarded seeder would dutifully retire most of the table.

**Alerting.** There was none — the whole failure surface was ``logger.error`` to
stdout, so a refresh could fail every month and nobody would know until a member
asked why their visa was missing. Failures now email the ops address if Resend is
configured, and the send is best-effort: an alert that raises would take the job
out of the scheduler, which is the exact failure it exists to report.
"""

import importlib.util
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# The fetchers and seeders live in ``scripts/`` — they are operator tools first
# and were written as CLIs. Loading them by path rather than duplicating ~600
# lines of HTML/JSON parsing into the package is the lesser evil; moving them
# into ``app.agents.immigration.community`` and leaving thin CLIs behind is the
# better long-term shape, and is a refactor rather than this phase's work.
_SCRIPTS_DIR = Path(__file__).resolve().parents[5] / "scripts"


def _load(module_name: str):
    """Import a ``scripts/`` module by path."""
    path = _SCRIPTS_DIR / f"{module_name}.py"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found — is the repo laid out as expected?")
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def should_run_scheduled_jobs() -> bool:
    """Is this process the one that runs cron work?

    Defaults to **true** so a single-dyno deployment (which is what this is
    today) keeps working with no configuration. Set ``RUN_SCHEDULED_JOBS=false``
    on every dyno but one before scaling past one web dyno — otherwise each
    replica independently fetches from Home Affairs on the same schedule.

    Heroku exposes ``DYNO`` as e.g. ``web.1`` / ``web.2``; when it is present and
    the explicit flag is not set, only ``.1`` runs the jobs. That makes scaling
    safe by default rather than safe only if someone remembered.
    """
    explicit = os.environ.get("RUN_SCHEDULED_JOBS")
    if explicit is not None:
        return explicit.strip().lower() not in {"0", "false", "no"}

    dyno = os.environ.get("DYNO")
    if dyno and "." in dyno:
        return dyno.rsplit(".", 1)[1] == "1"
    return True


async def _alert(subject: str, body: str) -> None:
    """Best-effort ops alert. Never raises."""
    try:
        from app.core.config import get_settings

        settings = get_settings()
        to = getattr(settings, "ops_alert_email", None) or getattr(
            settings, "resend_reply_to", None
        )
        if not (getattr(settings, "resend_configured", False) and to):
            logger.warning("ALERT (not sent, Resend unconfigured): %s — %s", subject, body)
            return

        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": settings.resend_from_email,
                "to": [to],
                "subject": f"[immi360] {subject}",
                "text": body,
            }
        )
        logger.info("Ops alert sent: %s", subject)
    except Exception as err:  # noqa: BLE001 — an alert must never be the failure
        logger.error("Could not send ops alert (%s): %s", subject, err, exc_info=True)


async def refresh_taxonomy(*, fetch: bool = True) -> dict:
    """Re-fetch the DHA visa taxonomy and re-seed ``visa_subclasses``.

    ``fetch=False`` re-seeds from the committed snapshot without touching the
    network — what the tests use, and what an operator wants after editing the
    snapshot by hand.
    """
    if fetch:
        fetcher = _load("fetch_dha_taxonomy")
        await _maybe_await(fetcher.main())

    seeder = _load("seed_visa_taxonomy")
    result = await seeder.run(dry_run=False)
    logger.info("Taxonomy refresh: %s", result)
    return result


async def refresh_occupations(*, fetch: bool = True) -> dict:
    """Re-fetch the DHA skilled occupation list and re-seed ``occupations``."""
    if fetch:
        fetcher = _load("fetch_dha_occupations")
        await _maybe_await(fetcher.main())

    seeder = _load("seed_occupations")
    result = await seeder.run(dry_run=False)
    logger.info("Occupation refresh: %s", result)
    return result


async def _maybe_await(value):
    """The fetchers are sync CLIs; tolerate either shape."""
    if hasattr(value, "__await__"):
        return await value
    return value


async def check_cohort_integrity() -> Optional[str]:
    """Are any statistics rows pooling on a cohort no visa serves?

    Run after a refresh, because a taxonomy change is exactly what strands them:
    ``community_timelines.subclass_slug`` holds a *cohort key*, and re-seeding
    rewrites ``visa_subclasses`` without touching the mirror. Returns a
    human-readable problem description, or ``None`` when everything lines up.
    """
    from sqlalchemy import func, select

    from app.agents.immigration.community.models import CommunityTimeline, VisaSubclass
    from app.db.session import get_async_session

    async with get_async_session() as db:
        subclasses = (await db.execute(select(VisaSubclass))).scalars().all()
        live = {s.cohort_key or s.slug for s in subclasses}
        rows = (
            await db.execute(
                select(CommunityTimeline.subclass_slug, func.count()).group_by(
                    CommunityTimeline.subclass_slug
                )
            )
        ).all()

    stranded = [(k, n) for k, n in rows if k not in live]
    if not stranded:
        return None
    total = sum(n for _, n in stranded)
    detail = ", ".join(f"{k} ({n})" for k, n in sorted(stranded, key=lambda kv: -kv[1])[:10])
    return (
        f"{total} timeline row(s) are pooling on {len(stranded)} cohort(s) that no "
        f"visa serves: {detail}. Those timelines have silently stopped counting "
        "toward any published figure. Run `python scripts/check_cohort_integrity.py "
        "--fix`."
    )
