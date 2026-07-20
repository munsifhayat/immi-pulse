"""Fetch the Home Affairs visa taxonomy + global processing times.

Home Affairs' public processing-times tool is a thin client over an undocumented
JSON API. Two endpoints give us the entire visa taxonomy *and* the official
percentiles that our wait-check compares members against:

    POST /_layouts/15/api/GPT.aspx/GetProcessGuideVisas          -> 76 rows
    POST /_layouts/15/api/GPT.aspx/GetVisaGlobalProcessingTime   -> percentiles

Before this, our ``visa_subclasses`` table held 8 hand-seeded rows with figures
frozen into migration ``a1c2e3f4d5b6`` ("Mar 2026"). Those numbers had drifted
badly — the seed put 186 Direct Entry at p50=210 days where Home Affairs now
publishes 9 months (274 days). This script is how that stops happening.

Output is a **snapshot committed to the repo** (``scripts/dha_taxonomy.json``),
not a live call at request time. Three reasons: the endpoint is Akamai-fronted
and rate-limits aggressively, a blocked run must never empty the table, and a
reviewable diff of "what Home Affairs changed this month" is genuinely useful.

Run:    python scripts/fetch_dha_taxonomy.py [--out PATH] [--dry-run]
Then:   PYTHONPATH=src python scripts/seed_visa_taxonomy.py

Gotchas encoded below, all found the hard way:
  * Requires a browser User-Agent + Referer. Without them: 403.
  * Subclass codes are NOT integers — ``482-1``, ``858-3``, ``858-4`` are real.
    858 appears twice: ``858-3`` is legacy Global Talent (lodged pre-6 Dec 2024),
    ``858-4`` is the current National Innovation visa. Collapsing them merges two
    different programs with a 3x difference in processing time.
  * Percentiles come back as human strings: "6 Months", "14 Days",
    "Less than 1 Day". They need parsing, and "Less than 1 Day" is not zero-safe
    to treat as missing.
  * 482 and 870 expose ``Nomination``/``Sponsorship`` as pseudo-streams. They are
    lodgement *stages* with their own clocks, not visa streams — flagged
    ``is_stage`` so the UI never offers them as "which stream are you on?".
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "https://immi.homeaffairs.gov.au/_layouts/15/api/GPT.aspx"
REFERER = (
    "https://immi.homeaffairs.gov.au/visas/getting-a-visa/"
    "visa-processing-times/global-visa-processing-times"
)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
DEFAULT_OUT = os.path.join(os.path.dirname(__file__), "dha_taxonomy.json")

# Batch size for the percentile call. The endpoint accepts the full 76 in one
# request, but Akamai is happier with smaller bursts and a blocked run costs a
# whole refresh cycle.
BATCH = 12
THROTTLE_SECONDS = 1.5

DAYS_PER_MONTH = 30.44  # calendar-average; DHA publishes whole months

# Streams that are lodgement stages rather than visa streams. Keyed by
# (subclass_code, stream_text) because "Sponsorship" means different things.
STAGE_STREAMS = {
    ("482-1", "Nomination"),
    ("482-1", "Sponsorship"),
    ("870", "Sponsorship"),
}

# Subclass -> our community category. Anything unmapped falls to "general",
# which is a visible prompt to curate it rather than a silent default.
CATEGORY_BY_SUBCLASS = {
    "189": "skilled-migration", "190": "skilled-migration",
    "191": "skilled-migration", "491": "skilled-migration",
    "887": "skilled-migration", "858": "skilled-migration",
    "858-3": "skilled-migration", "858-4": "skilled-migration",
    "186": "employer-sponsored", "187": "employer-sponsored",
    "494": "employer-sponsored", "482": "employer-sponsored",
    "482-1": "employer-sponsored", "407": "employer-sponsored",
    "400": "employer-sponsored", "403": "employer-sponsored",
    "408": "employer-sponsored",
    "485": "graduate-post-study",
    "500": "student-visas", "590": "student-visas",
    "820": "partner-visas", "801": "partner-visas",
    "309": "partner-visas", "100": "partner-visas",
    "300": "partner-visas", "445": "partner-visas", "461": "partner-visas",
    "101": "family-parent", "102": "family-parent", "802": "family-parent",
    "117": "family-parent", "870": "family-parent",
    "600": "visitor-tourist", "601": "visitor-tourist",
    "651": "visitor-tourist", "602": "visitor-tourist",
    "771": "visitor-tourist", "988": "visitor-tourist",
    "417": "working-holiday", "462": "working-holiday",
    "155": "citizenship-pr", "157": "citizenship-pr",
    "188": "general", "888": "general", "132": "general",
}

# Home Affairs says "Pathway" in the API for 186/187 but "stream" on the visa
# pages themselves. Members read the visa pages, so we follow those.
STREAM_LABEL_OVERRIDES = {
    ("186", "Direct Entry Pathway"): "Direct Entry",
    ("186", "Agreement Pathway"): "Labour Agreement",
    ("186", "Transition Pathway"): "Temporary Residence Transition (TRT)",
    ("187", "Transition Pathway"): "Temporary Residence Transition (TRT)",
    ("491", "State/Territory Government Nominated Regional"): "State or Territory nominated",
    ("491", "Family Sponsored Regional"): "Family sponsored",
}

# Cohort statistics split by stream only where the stream actually predicts a
# different wait. Computed from the live spread (see ``_split_by_stream``), but
# these are pinned because the arithmetic is noisy near the threshold.
FORCE_NO_SPLIT = {"186", "485", "494"}


def _post(path: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}/{path}",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": USER_AGENT,
            "Referer": REFERER,
            "Accept": "application/json, text/javascript, */*; q=0.01",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        body = json.loads(resp.read().decode())
    d = body.get("d") or {}
    if not d.get("success"):
        raise RuntimeError(f"{path} returned success=false: {d.get('message')!r}")
    return d.get("data") or []


def parse_duration_days(text: str) -> int | None:
    """'6 Months' -> 183, '14 Days' -> 14, 'Less than 1 Day' -> 0."""
    if not text:
        return None
    t = text.strip()
    if re.match(r"^less than 1 day$", t, re.I):
        return 0
    m = re.match(r"^(\d+)\s*day", t, re.I)
    if m:
        return int(m.group(1))
    m = re.match(r"^(\d+)\s*month", t, re.I)
    if m:
        return round(int(m.group(1)) * DAYS_PER_MONTH)
    m = re.match(r"^(\d+)\s*year", t, re.I)
    if m:
        return round(int(m.group(1)) * 365)
    return None


def slugify(text: str) -> str:
    s = re.sub(r"\(.*?\)", " ", text or "")          # drop parenthetical asides
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s


def subclass_number(code: str) -> str:
    """'482-1' -> '482'. The suffix is a DHA program discriminator, not a visa."""
    return code.split("-", 1)[0]


def _split_by_stream(streams: list[dict]) -> bool:
    """Does stream choice predict a materially different wait?

    Splitting cohorts by stream halves an already-scarce sample, so it has to
    earn its place. Threshold is a 1.5x spread at the 75th percentile across
    real (non-stage) streams — 485's two streams sit at 1.0x and would be pure
    sample-splitting; 500's seven span 35x and would be malpractice to merge.
    """
    vals = [
        s["official_p75_days"]
        for s in streams
        if not s["is_stage"] and s.get("official_p75_days")
    ]
    if len(vals) < 2:
        return False
    lo, hi = min(vals), max(vals)
    return bool(lo) and (hi / lo) >= 1.5


def fetch() -> dict:
    print("→ GetProcessGuideVisas", file=sys.stderr)
    rows = _post("GetProcessGuideVisas", {})
    print(f"  {len(rows)} subclass+stream rows", file=sys.stderr)

    times: dict[tuple[str, str], dict] = {}
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        req = [
            {"VisaSubclassCode": r["VisaSubclassCode"], "StreamCode": r["StreamCode"]}
            for r in chunk
        ]
        print(
            f"→ GetVisaGlobalProcessingTime [{i + 1}-{i + len(chunk)}/{len(rows)}]",
            file=sys.stderr,
        )
        for attempt in range(3):
            try:
                for t in _post("GetVisaGlobalProcessingTime", {"gptRequest": req}):
                    times[(t["VisaSubclassCode"], t.get("StreamCode") or "")] = t
                break
            except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as exc:
                wait = 4 * (attempt + 1)
                print(f"  retry in {wait}s ({exc})", file=sys.stderr)
                time.sleep(wait)
        else:
            raise RuntimeError("percentile endpoint failed after 3 attempts")
        time.sleep(THROTTLE_SECONDS)

    by_subclass: dict[str, dict] = {}
    for r in rows:
        code = r["VisaSubclassCode"]
        stream_code = r.get("StreamCode") or ""
        stream_text = (r.get("StreamText") or "").strip()
        name = re.sub(r"\s*\(subclass[^)]*\)", "", r["VisaSubclassText"]).strip()
        name = re.sub(r"\s{2,}", " ", name)

        sub = by_subclass.setdefault(
            code,
            {
                "subclass_code": code,
                "subclass_number": subclass_number(code),
                "slug": slugify(f"{subclass_number(code)}-{name}")[:64],
                "name": name,
                "category_slug": CATEGORY_BY_SUBCLASS.get(code, "general"),
                "streams": [],
            },
        )

        t = times.get((code, stream_code), {})
        label = STREAM_LABEL_OVERRIDES.get((code, stream_text), stream_text)
        sub["streams"].append(
            {
                "dha_stream_code": stream_code,
                "stream_name": stream_text,
                "display_name": label,
                # A streamless subclass still needs a stream row (it is the
                # cohort key), and it must borrow the *subclass* slug rather
                # than the bare number: 858-3 Global Talent and 858-4 National
                # Innovation are different programs that both answer to "858".
                "slug": (
                    slugify(f"{subclass_number(code)}-{label}")[:64]
                    if stream_text
                    else sub["slug"]
                ),
                "is_stage": (code, stream_text) in STAGE_STREAMS,
                "official_p25_days": parse_duration_days(t.get("Percent25", "")),
                "official_p50_days": parse_duration_days(t.get("Percent50", "")),
                "official_p75_days": parse_duration_days(t.get("Percent75", "")),
                "official_p90_days": parse_duration_days(t.get("Percent90", "")),
                "official_p25_label": t.get("Percent25") or None,
                "official_p50_label": t.get("Percent50") or None,
                "official_p75_label": t.get("Percent75") or None,
                "official_p90_label": t.get("Percent90") or None,
                "official_updated": t.get("Updated") or None,
                "official_end_date": t.get("EndDate") or None,
            }
        )

    for code, sub in by_subclass.items():
        sub["cohort_split_by_stream"] = (
            False
            if sub["subclass_number"] in FORCE_NO_SPLIT
            else _split_by_stream(sub["streams"])
        )
        sub["has_streams"] = any(s["stream_name"] for s in sub["streams"])

    updated = next(
        (t.get("Updated") for t in times.values() if t.get("Updated")), None
    )
    end_date = next(
        (t.get("EndDate") for t in times.values() if t.get("EndDate")), None
    )
    return {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": f"{BASE}/GetProcessGuideVisas",
        "official_updated": updated,
        "official_end_date": end_date,
        "subclass_count": len(by_subclass),
        "stream_count": len(rows),
        "subclasses": sorted(by_subclass.values(), key=lambda s: s["subclass_code"]),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--dry-run", action="store_true", help="print summary, write nothing")
    args = ap.parse_args()

    snap = fetch()

    split = [s for s in snap["subclasses"] if s["cohort_split_by_stream"]]
    print(
        f"\n{snap['subclass_count']} subclasses / {snap['stream_count']} streams"
        f"  ·  official as at {snap['official_updated']}"
        f" (to {snap['official_end_date']})",
        file=sys.stderr,
    )
    print(f"cohort-split by stream: {', '.join(s['subclass_code'] for s in split)}", file=sys.stderr)
    ungrouped = [s["subclass_code"] for s in snap["subclasses"] if s["category_slug"] == "general"]
    if ungrouped:
        print(f"uncategorised (fell to 'general'): {', '.join(ungrouped)}", file=sys.stderr)

    if args.dry_run:
        return 0
    with open(args.out, "w") as fh:
        json.dump(snap, fh, indent=2, sort_keys=False)
        fh.write("\n")
    print(f"wrote {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
