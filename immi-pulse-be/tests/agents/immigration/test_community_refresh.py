"""Pure-logic checks for the scheduled dataset refresh.

The three properties that make it safe to run unattended, none of which you can
observe by reading a log:

  * **One runner.** Registering these jobs on every dyno means two replicas
    racing the same rate-limited government API on the same schedule.
  * **A drift guard.** A blocked fetch produces a *valid* snapshot with too few
    rows in it. An unguarded seeder retires the rest of the table and nothing
    raises.
  * **An alert that cannot itself break the scheduler.** These jobs swallow
    exceptions by design — a raising job is removed from APScheduler — so the
    alert is the only thing standing between a failed refresh and silence. If
    the alert raises, it takes the job with it.
"""

import os

import pytest

from app.agents.immigration.community import refresh


# --- The replica gate --------------------------------------------------------


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    monkeypatch.delenv("RUN_SCHEDULED_JOBS", raising=False)
    monkeypatch.delenv("DYNO", raising=False)


def test_single_process_runs_jobs_by_default():
    """A deployment that has never heard of this flag keeps working."""
    assert refresh.should_run_scheduled_jobs() is True


@pytest.mark.parametrize("value", ["false", "False", "0", "no", " FALSE "])
def test_explicit_opt_out(monkeypatch, value):
    monkeypatch.setenv("RUN_SCHEDULED_JOBS", value)
    assert refresh.should_run_scheduled_jobs() is False


@pytest.mark.parametrize("value", ["true", "1", "yes"])
def test_explicit_opt_in(monkeypatch, value):
    monkeypatch.setenv("RUN_SCHEDULED_JOBS", value)
    assert refresh.should_run_scheduled_jobs() is True


def test_only_the_first_dyno_runs_jobs(monkeypatch):
    """Scaling to two web dynos must not double the fetches."""
    monkeypatch.setenv("DYNO", "web.1")
    assert refresh.should_run_scheduled_jobs() is True
    monkeypatch.setenv("DYNO", "web.2")
    assert refresh.should_run_scheduled_jobs() is False
    monkeypatch.setenv("DYNO", "web.17")
    assert refresh.should_run_scheduled_jobs() is False


def test_explicit_flag_beats_the_dyno_heuristic(monkeypatch):
    """An operator who names a runner outranks the guess."""
    monkeypatch.setenv("DYNO", "worker.3")
    monkeypatch.setenv("RUN_SCHEDULED_JOBS", "true")
    assert refresh.should_run_scheduled_jobs() is True


def test_a_dyno_with_no_index_still_runs(monkeypatch):
    """`run.1234` one-off dynos and odd shapes must not silently disable cron."""
    monkeypatch.setenv("DYNO", "release")
    assert refresh.should_run_scheduled_jobs() is True


# --- The drift guard ---------------------------------------------------------


def _seeder(name: str):
    return refresh._load(name)


def test_seeders_expose_a_drift_ceiling():
    for name in ("seed_visa_taxonomy", "seed_occupations"):
        mod = _seeder(name)
        assert 0 < mod.MAX_RETIRE_SHARE < 1, name
        assert issubclass(mod.SeedDriftError, RuntimeError), name


@pytest.mark.asyncio
async def test_empty_taxonomy_snapshot_is_refused(monkeypatch, tmp_path):
    """The failure mode this exists for: a fetch that returned nothing."""
    mod = _seeder("seed_visa_taxonomy")
    empty = tmp_path / "empty.json"
    empty.write_text('{"subclass_count": 0, "stream_count": 0, "subclasses": []}')
    monkeypatch.setattr(mod, "DATA_PATH", str(empty))
    with pytest.raises(mod.SeedDriftError, match="no visas"):
        await mod.run(dry_run=False)


@pytest.mark.asyncio
async def test_empty_occupation_snapshot_is_refused(monkeypatch, tmp_path):
    mod = _seeder("seed_occupations")
    empty = tmp_path / "empty.json"
    empty.write_text(
        '{"occupation_count": 0, "fetched_at": "2026-07-19T00:00:00", '
        '"occupations": [], "requires_occupation_subclasses": [], '
        '"anzsco_2022_subclasses": []}'
    )
    monkeypatch.setattr(mod, "DATA_PATH", str(empty))
    with pytest.raises(mod.SeedDriftError, match="no occupations"):
        await mod.run(dry_run=False)


def test_committed_snapshots_are_well_inside_the_guard():
    """The real data must not be sitting near the cliff — if it were, the guard
    would be one ordinary refresh away from blocking a legitimate run."""
    import json

    tax = json.loads((refresh._SCRIPTS_DIR / "dha_taxonomy.json").read_text())
    occ = json.loads((refresh._SCRIPTS_DIR / "dha_occupations.json").read_text())
    assert len(tax["subclasses"]) >= 40
    assert len(occ["occupations"]) >= 700


# --- The alert cannot break the scheduler ------------------------------------


@pytest.mark.asyncio
async def test_alert_never_raises_when_unconfigured():
    """No Resend key is the normal state locally and in CI."""
    await refresh._alert("subject", "body")  # must simply return


@pytest.mark.asyncio
async def test_alert_swallows_a_broken_transport(monkeypatch):
    """If the alert raised, it would take the job out of the scheduler — the
    exact failure it exists to report."""
    from app.core import config

    class _Settings:
        resend_configured = True
        resend_api_key = "re_test"
        resend_from_email = "x@example.com"
        resend_reply_to = "ops@example.com"
        ops_alert_email = "ops@example.com"

    monkeypatch.setattr(config, "get_settings", lambda: _Settings())

    import sys
    import types

    broken = types.ModuleType("resend")

    class _Emails:
        @staticmethod
        def send(_payload):
            raise RuntimeError("transport is down")

    broken.Emails = _Emails
    broken.api_key = None
    monkeypatch.setitem(sys.modules, "resend", broken)

    await refresh._alert("subject", "body")  # must not raise
