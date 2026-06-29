#!/usr/bin/env python3
"""Stage A — harvest raw AU visa-timeline discussions from myimmitracker.

myimmitracker runs Discourse, which serves a clean, PUBLIC JSON API (no auth, no
anti-bot). We pull the "Immigration to Australia" category and emit raw topics
for the OpenAI normaliser (Stage B, normalize.py) to anonymise + map into our
community schema. Compared with HTML scraping this gives us structured data
(title, dated posts, counts) directly — higher quality and far more robust for
an unattended morning loop.

What we deliberately do NOT do:
  * We do NOT scrape expatforum.com — it sits behind a proof-of-work +
    headless-detection anti-bot wall; fighting that is fragile and amounts to
    circumventing an access-control measure.
  * We do NOT use ScraperAI here — a structured JSON API beats auto-detected
    HTML XPaths. ScraperAI stays installed (scripts/scraping/.venv-scraper) and
    is wired via harvest_scraperai.py for any FUTURE HTML-only AU source.

Polite by design: an identifying User-Agent, a conservative rate limit, HTTP 429
backoff, a per-run cap, and a persistent seen-set so each run only fetches NEW
topics (so the loop accumulates coverage instead of re-pulling the same threads).

Pure standard-library (urllib + json) — no third-party deps — so it runs in the
backend venv with zero install risk.

Output: scripts/scraping/data/harvested_raw.json  (list of raw topic records,
        consumed + cleared by normalize.py)
Run:    python scripts/scraping/harvest.py [--max-topics N] [--max-posts M]
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "https://discussions.myimmitracker.com"
SOURCE_SITE = "myimmitracker.com"
CATEGORY_SLUG = "immigration-to-australia"
CATEGORY_ID = 6

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
RAW_PATH = os.path.join(DATA_DIR, "harvested_raw.json")
SEEN_PATH = os.path.join(DATA_DIR, "harvested_topics.json")  # topic ids ever fetched
SKIPPED_PATH = os.path.join(DATA_DIR, "skipped_urls.json")    # urls the normaliser rejected
# Sibling of scripts/scraping/ -> scripts/scraped_journeys.json (accepted records).
SCRAPED_JOURNEYS_PATH = os.path.normpath(
    os.path.join(HERE, "..", "scraped_journeys.json")
)

# Identify ourselves honestly; rate-limit so we stay a good citizen of a small
# community forum. Discourse tolerates a few requests/second; we go slower.
USER_AGENT = (
    "immi-pulse-community-research/1.0 "
    "(anonymised visa wait-time aggregation; contact: munsif@horizondigital.au)"
)
REQUEST_DELAY_S = 1.5      # between topic fetches
PAGE_DELAY_S = 1.0        # between category-list pages
MAX_RETRIES = 4
MIN_TOPIC_CHARS = 120     # skip near-empty topics before they reach the LLM

DEFAULT_MAX_TOPICS = 40   # per run — caps Stage-B LLM spend for the morning loop
DEFAULT_MAX_POSTS = 12    # posts kept per topic (OP + early replies hold the timeline)


# --------------------------------------------------------------------------- IO
def _load_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path) as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return default


def _write_json(path: str, value) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(value, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def _topic_id_from_url(url: str) -> int | None:
    """Pull the trailing Discourse topic id out of a /t/<slug>/<id>[?...] URL."""
    m = re.search(r"/t/[^/]+/(\d+)", url or "")
    return int(m.group(1)) if m else None


# ------------------------------------------------------------------------- HTTP
def _get_json(path: str) -> dict | None:
    url = path if path.startswith("http") else BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                               "Accept": "application/json"})
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:  # rate limited — honour Retry-After / back off
                wait = int(e.headers.get("Retry-After", attempt * 10))
                print(f"  429 rate-limited; backing off {wait}s", flush=True)
                time.sleep(wait)
                continue
            if e.code in (403, 404):
                return None
            print(f"  HTTP {e.code} on {url} (attempt {attempt})", flush=True)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            print(f"  net error on {url}: {e} (attempt {attempt})", flush=True)
        time.sleep(attempt * 3)
    return None


# ---------------------------------------------------------------- HTML cleaning
_QUOTE_RE = re.compile(r"<aside\b[^>]*\bquote\b.*?</aside>", re.S | re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t ]+")
_NL_RE = re.compile(r"\n{3,}")


def _clean(cooked: str) -> str:
    """Discourse 'cooked' HTML -> readable plain text (quotes stripped)."""
    if not cooked:
        return ""
    text = _QUOTE_RE.sub(" ", cooked)         # drop nested quote-backs (noise)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text)
    text = _WS_RE.sub(" ", text)
    text = _NL_RE.sub("\n\n", text)
    return text.strip()


# ----------------------------------------------------------------- harvest core
def iter_category_topics(seen_ids: set[int]):
    """Yield (topic_id, slug, title) for AU-category topics not already seen."""
    page = 0
    while True:
        # This Discourse (2.4.x) exposes the category topic list by id only:
        # /c/<id>.json — the slug-prefixed route 404s on older versions.
        data = _get_json(f"/c/{CATEGORY_ID}.json?page={page}")
        topics = (((data or {}).get("topic_list") or {}).get("topics")) or []
        if not topics:
            return
        for t in topics:
            tid = t.get("id")
            if tid is None or tid in seen_ids:
                continue
            yield tid, t.get("slug", f"topic-{tid}"), t.get("title", "")
        page += 1
        time.sleep(PAGE_DELAY_S)


def fetch_topic(tid: int, slug: str, max_posts: int) -> dict | None:
    data = _get_json(f"/t/{tid}.json")
    if not data:
        return None
    posts = (((data.get("post_stream") or {}).get("posts")) or [])[:max_posts]
    cleaned = []
    for p in posts:
        body = _clean(p.get("cooked", ""))
        if body:
            cleaned.append({"date": (p.get("created_at") or "")[:10], "text": body})
    total_chars = sum(len(c["text"]) for c in cleaned)
    if total_chars < MIN_TOPIC_CHARS:
        return None
    return {
        "source_site": SOURCE_SITE,
        "source_url": f"{BASE}/t/{slug}/{tid}",   # canonical (no ?page=)
        "topic_id": tid,
        "title": data.get("title", ""),
        "created_at": data.get("created_at", ""),
        "posts_count": data.get("posts_count"),
        "posts": cleaned,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Harvest AU visa timelines (myimmitracker/Discourse).")
    ap.add_argument("--max-topics", type=int, default=DEFAULT_MAX_TOPICS)
    ap.add_argument("--max-posts", type=int, default=DEFAULT_MAX_POSTS)
    args = ap.parse_args()

    # Build the do-not-refetch set: topics fetched before + topics already
    # accepted into scraped_journeys.json + topics the normaliser rejected.
    seen_ids: set[int] = set(_load_json(SEEN_PATH, []))
    for rec in _load_json(SCRAPED_JOURNEYS_PATH, []):
        tid = _topic_id_from_url(rec.get("source_url", ""))
        if tid:
            seen_ids.add(tid)
    for url in _load_json(SKIPPED_PATH, []):
        tid = _topic_id_from_url(url)
        if tid:
            seen_ids.add(tid)
    # Keep any raw records not yet consumed by the normaliser.
    raw: list[dict] = _load_json(RAW_PATH, [])
    for rec in raw:
        if rec.get("topic_id"):
            seen_ids.add(rec["topic_id"])

    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[harvest {started}] AU category '{CATEGORY_SLUG}' — "
          f"{len(seen_ids)} topics already known; targeting up to "
          f"{args.max_topics} new.", flush=True)

    new_count = 0
    try:
        for tid, slug, title in iter_category_topics(seen_ids):
            if new_count >= args.max_topics:
                break
            rec = fetch_topic(tid, slug, args.max_posts)
            seen_ids.add(tid)  # mark fetched regardless of usefulness
            if rec:
                raw.append(rec)
                new_count += 1
                print(f"  + [{new_count}/{args.max_topics}] t/{tid} "
                      f"({rec['posts_count']} posts) {title[:60]!r}", flush=True)
            time.sleep(REQUEST_DELAY_S)
    finally:
        # Persist progress even on interruption so we never re-pull the same set.
        _write_json(RAW_PATH, raw)
        _write_json(SEEN_PATH, sorted(seen_ids))

    print(f"[harvest] wrote {new_count} new raw topics -> "
          f"{os.path.relpath(RAW_PATH, HERE)} "
          f"({len(raw)} pending normalisation).", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
