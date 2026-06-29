#!/usr/bin/env python3
"""Stage B — normalise raw harvested topics into anonymised schema records.

This is the privacy + compliance core of the harvester. Each raw topic
(harvested_raw.json) is sent to OpenAI (gpt-4o-mini, the configured analyzer
model) with a strict instruction to produce ONE anonymised, *paraphrased*
Australian visa-timeline record that matches scripts/scraped_journeys.json
exactly — or to skip it. We then validate against the server's controlled
vocabularies (MILESTONE_TYPES, outcomes, the existing subclass/category slugs),
run a PII backstop scrub, and APPEND accepted records to scraped_journeys.json
(deduped by canonical source_url).

Guarantees preserved end-to-end:
  * Never verbatim — the model paraphrases; a backstop scrub redacts any
    emails/URLs/@handles/long digit runs that slip through.
  * Facts only — subclass + dated milestones + coarse profile; no names,
    usernames, employers, agents or reference numbers.
  * Stats-isolated — the seeder (Stage C) flags every row is_sample=True and
    never mirrors it into community_timelines, so the wait-check percentile
    engine stays computed from genuine first-party submissions only.

Run (from immi-pulse-be/):
    PYTHONPATH=src .venv/bin/python scripts/scraping/normalize.py [--min-confidence 0.55] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date

from openai import OpenAI

from app.agents.immigration.community.models import (
    MILESTONE_TYPES,
    POST_TYPES,
    TIMELINE_OUTCOMES,
)
from app.core.config import get_settings

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_PATH = os.path.join(HERE, "data", "harvested_raw.json")
SKIPPED_PATH = os.path.join(HERE, "data", "skipped_urls.json")
SCRAPED_JOURNEYS_PATH = os.path.normpath(os.path.join(HERE, "..", "scraped_journeys.json"))

# Keep the feed coherent: only the subclass slugs already present in the dataset
# (the frontend renders these). Anything that doesn't map -> skip.
ALLOWED_SUBCLASSES = {
    "189-independent": "Skilled Independent (subclass 189)",
    "190-nominated": "Skilled Nominated (subclass 190)",
    "491-regional": "Skilled Work Regional (subclass 491)",
    "186-direct-entry": "Employer Nomination Scheme (subclass 186)",
    "482-core-skills": "Skills in Demand / TSS (subclass 482)",
    "485-post-study": "Temporary Graduate (subclass 485)",
    "500-higher-ed": "Student (subclass 500)",
    "820-partner": "Partner onshore (subclass 820/801)",
}
ALLOWED_CATEGORIES = {
    "skilled-migration", "employer-sponsored", "partner-visas",
    "graduate-post-study", "student-visas",
}
ALLOWED_STATES = {"ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA", "Offshore"}
ALLOWED_AREAS = {"metro", "regional"}
ALLOWED_SPONSOR = {"accredited", "non_accredited"}

MAX_INPUT_CHARS = 6000  # bound tokens per topic

# PII backstop — redact anything the model may have left in.
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_HANDLE_RE = re.compile(r"(?<!\w)@\w{2,}")
_PHONE_RE = re.compile(r"\+?\d[\d ()-]{7,}\d")
_LONGNUM_RE = re.compile(r"\b\d{6,}\b")  # reference / receipt numbers


def _scrub(text: str | None) -> str | None:
    if not text:
        return text
    text = _EMAIL_RE.sub("[removed]", text)
    text = _URL_RE.sub("", text)
    text = _HANDLE_RE.sub("someone", text)
    text = _PHONE_RE.sub("[removed]", text)
    text = _LONGNUM_RE.sub("a reference number", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def _canon(url: str) -> str:
    return (url or "").split("?")[0].rstrip("/")


def _coerce_date(value: str) -> str | None:
    """Accept YYYY-MM-DD or YYYY-MM (-> first of month). Else None."""
    if not value:
        return None
    value = value.strip()
    try:
        date.fromisoformat(value)
        return value
    except ValueError:
        pass
    m = re.match(r"^(\d{4})-(\d{2})$", value)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), 1).isoformat()
        except ValueError:
            return None
    return None


def _load(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path) as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return default


def _write(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(value, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


SYSTEM_PROMPT = (
    "You convert a public Australian-immigration forum thread into ONE anonymised, "
    "paraphrased visa-timeline record for a community 'is my wait normal?' feed.\n\n"
    "HARD RULES:\n"
    "1. PARAPHRASE everything. Never copy sentences verbatim.\n"
    "2. Strip ALL personally identifying info: names, usernames, emails, phone "
    "numbers, employer names, migration-agent names, file/reference/receipt "
    "numbers, exact addresses. Keep only facts.\n"
    "3. AUSTRALIA ONLY. If the thread is about Canada or any non-Australian visa, "
    "or has no usable visa-application content, return {\"skip\": true, \"reason\": \"...\"}.\n"
    "4. Prefer a 'timeline' with >=1 dated milestone (extract the most complete "
    "single applicant's journey in the thread). If there is no datable journey but "
    "there is a clear AU visa question, return post_type 'question'. Otherwise skip.\n"
    "5. Dates -> 'YYYY-MM-DD' (use the 1st if only month/year is known).\n\n"
    "Return STRICT JSON with this shape (omit source fields — added later):\n"
    "{\n"
    '  "post_type": "timeline" | "question",\n'
    '  "subclass_slug": one of <SUBCLASSES> (required for timeline),\n'
    '  "category_slug": one of <CATEGORIES>,\n'
    '  "outcome": "waiting" | "granted" | "refused",\n'
    '  "stream": short label or null (e.g. "Points-tested", "Direct Entry", "State-nominated"),\n'
    '  "occupation": short ANZSCO-style role or null (no employer),\n'
    '  "state": one of ACT/NSW/NT/QLD/SA/TAS/VIC/WA/Offshore or null,\n'
    '  "area": "metro" | "regional" | null,\n'
    '  "sponsor_type": "accredited" | "non_accredited" | null,\n'
    '  "title": short paraphrased title (questions only; else null),\n'
    '  "note": 1-3 sentence paraphrased factual summary, no PII,\n'
    '  "milestones": [{"type": one of <MILESTONES>, "date": "YYYY-MM-DD"}],\n'
    '  "comments": [{"body": paraphrased helpful reply (no PII), "replies": [{"body": "..."}]}],\n'
    '  "confidence": 0.0-1.0\n'
    "}\n"
    "Use at most 3 comments and keep them short. If unsure, lower confidence."
)


def _build_user_prompt(rec: dict) -> str:
    posts = rec.get("posts", [])
    chunks, total = [], 0
    for p in posts:
        line = f"[{p.get('date','')}] {p.get('text','')}"
        if total + len(line) > MAX_INPUT_CHARS:
            chunks.append(line[: MAX_INPUT_CHARS - total])
            break
        chunks.append(line)
        total += len(line)
    body = "\n\n".join(chunks)
    return f"THREAD TITLE: {rec.get('title','')}\n\nPOSTS (oldest first):\n{body}"


def _render_system() -> str:
    subs = "; ".join(f"{k} = {v}" for k, v in ALLOWED_SUBCLASSES.items())
    return (
        SYSTEM_PROMPT
        .replace("<SUBCLASSES>", subs)
        .replace("<CATEGORIES>", ", ".join(sorted(ALLOWED_CATEGORIES)))
        .replace("<MILESTONES>", ", ".join(MILESTONE_TYPES))
    )


def _validate(out: dict, rec: dict, min_conf: float) -> tuple[dict | None, str]:
    """Return (record_or_None, reason). None means skip."""
    if not isinstance(out, dict) or out.get("skip"):
        return None, str(out.get("reason", "model skipped")) if isinstance(out, dict) else "bad json"

    post_type = out.get("post_type", "timeline")
    if post_type not in POST_TYPES:
        return None, f"bad post_type {post_type!r}"

    conf = out.get("confidence")
    try:
        conf = float(conf)
    except (TypeError, ValueError):
        conf = 0.0
    if conf < min_conf:
        return None, f"low confidence {conf:.2f}"

    # Milestones -> validate types + dates.
    milestones = []
    for m in (out.get("milestones") or []):
        mtype = m.get("type")
        mdate = _coerce_date(m.get("date", ""))
        if mtype in MILESTONE_TYPES and mdate:
            milestones.append({"type": mtype, "date": mdate})

    subclass = out.get("subclass_slug")
    if subclass not in ALLOWED_SUBCLASSES:
        subclass = None

    if post_type == "timeline":
        if not milestones:
            return None, "timeline without valid milestones"
        if not subclass:
            return None, "timeline without mappable subclass"
    else:  # question
        if not (out.get("title") or "").strip():
            return None, "question without title"
        # Keep the feed cohort-relevant: only accept questions tied to a known
        # subclass. Generic "how do I contact immigration?" noise is dropped.
        if not subclass:
            return None, "question without mappable subclass"

    outcome = out.get("outcome", "waiting")
    if outcome not in TIMELINE_OUTCOMES:
        outcome = "waiting"

    category = out.get("category_slug")
    if category not in ALLOWED_CATEGORIES:
        category = None

    def _enum(v, allowed):
        return v if v in allowed else None

    comments = []
    for c in (out.get("comments") or [])[:3]:
        body = _scrub((c.get("body") or "").strip())
        if not body:
            continue
        replies = []
        for r in (c.get("replies") or [])[:2]:
            rb = _scrub((r.get("body") or "").strip())
            if rb:
                replies.append({"body": rb})
        comments.append({"body": body, "replies": replies})

    record = {
        "post_type": post_type,
        "subclass_slug": subclass,
        "category_slug": category,
        "outcome": outcome,
        "stream": (out.get("stream") or None),
        "occupation": _scrub(out.get("occupation")) or None,
        "state": _enum(out.get("state"), ALLOWED_STATES),
        "area": _enum(out.get("area"), ALLOWED_AREAS),
        "sponsor_type": _enum(out.get("sponsor_type"), ALLOWED_SPONSOR),
        "title": _scrub(out.get("title")) if post_type == "question" else None,
        "note": _scrub(out.get("note")) or None,
        "milestones": milestones,
        "comments": comments,
        "source_url": _canon(rec.get("source_url", "")),
        "source_site": rec.get("source_site", "myimmitracker.com"),
        "confidence": round(conf, 2),
    }
    return record, "ok"


def main() -> int:
    ap = argparse.ArgumentParser(description="Normalise harvested topics into scraped_journeys.json.")
    ap.add_argument("--min-confidence", type=float, default=0.55)
    ap.add_argument("--dry-run", action="store_true", help="don't write outputs")
    args = ap.parse_args()

    settings = get_settings()
    if not settings.openai_api_key:
        print("ERROR: OPENAI_API_KEY not configured (.env).", file=sys.stderr)
        return 2
    client = OpenAI(api_key=settings.openai_api_key)
    model = settings.openai_analyzer_model

    raw = _load(RAW_PATH, [])
    if not raw:
        print("No raw topics to normalise. Run harvest.py first.")
        return 0

    existing = _load(SCRAPED_JOURNEYS_PATH, [])
    existing_urls = {_canon(r.get("source_url", "")) for r in existing}
    skipped_urls = _load(SKIPPED_PATH, [])
    skipped_set = {_canon(u) for u in skipped_urls}

    system = _render_system()
    accepted, newly_skipped, leftover = [], [], []
    n_calls = 0
    print(f"Normalising {len(raw)} raw topics with {model} "
          f"(min confidence {args.min_confidence}).", flush=True)

    for rec in raw:
        url = _canon(rec.get("source_url", ""))
        if not url or url in existing_urls or url in skipped_set:
            continue  # already decided in a prior run
        try:
            resp = client.chat.completions.create(
                model=model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": _build_user_prompt(rec)},
                ],
            )
            n_calls += 1
            out = json.loads(resp.choices[0].message.content)
        except Exception as e:  # keep going; leave this topic for a retry next run
            print(f"  ! {url}: API/parse error: {e}", flush=True)
            leftover.append(rec)
            continue

        record, reason = _validate(out, rec, args.min_confidence)
        if record:
            accepted.append(record)
            existing_urls.add(url)
            ms = len(record["milestones"])
            print(f"  + {record['post_type']:<8} {record['subclass_slug'] or '-':<16} "
                  f"{ms} milestones  conf={record['confidence']}  {url}", flush=True)
        else:
            newly_skipped.append(url)
            skipped_set.add(url)
            print(f"  - skip ({reason})  {url}", flush=True)

    print(f"\nDone: {n_calls} calls -> {len(accepted)} accepted, "
          f"{len(newly_skipped)} skipped, {len(leftover)} deferred (errors).")

    if args.dry_run:
        print("[dry-run] no files written.")
        return 0

    if accepted:
        _write(SCRAPED_JOURNEYS_PATH, existing + accepted)
    if newly_skipped:
        _write(SKIPPED_PATH, skipped_urls + newly_skipped)
    # Clear consumed raw; keep only the error-deferred ones for next run.
    _write(RAW_PATH, leftover)

    total = len(existing) + len(accepted)
    print(f"scraped_journeys.json now holds {total} records "
          f"(+{len(accepted)} this run).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
