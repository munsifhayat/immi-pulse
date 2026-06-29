#!/usr/bin/env python3
"""Stage A (alternative) — ScraperAI harvester for FUTURE HTML-only AU sources.

The primary harvester (harvest.py) uses myimmitracker's clean Discourse JSON API.
This file is the escape hatch for an AU community that only serves HTML and is
NOT behind an anti-bot wall: ScraperAI auto-detects page type / pagination /
repeating catalog items / fields via an LLM, generates a reusable XPath "recipe",
and scrapes it. The recipe is saved to recipes/<site>.json so subsequent runs
skip the (paid) detection step.

It writes the SAME raw shape as harvest.py, so normalize.py (Stage B) consumes
its output unchanged.

⚠️  Runs in the QUARANTINED ScraperAI venv only (GPL-3.0 + legacy deps):
      scripts/scraping/.venv-scraper/bin/python scripts/scraping/harvest_scraperai.py \
          --url "https://example-au-forum/threads" --site example-au-forum.com --max-rows 30
    Requires OPENAI_API_KEY in the environment (export from immi-pulse-be/.env).
    Do NOT point this at sites that gate access with a proof-of-work / captcha /
    headless check (e.g. expatforum) — that would be circumventing an
    access-control measure.

This is a TEMPLATE: the field→raw mapping (FIELD_MAP below) is source-specific
and will usually need a one-line tweak per new site after the first detection run
prints the detected field names.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_PATH = os.path.join(HERE, "data", "harvested_raw.json")
RECIPES_DIR = os.path.join(HERE, "recipes")


def _build_driver():
    """Local headless Chrome for SeleniumCrawler."""
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager

    opts = webdriver.ChromeOptions()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,2000")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)


def _load_recipe(site: str):
    path = os.path.join(RECIPES_DIR, f"{site}.json")
    if os.path.exists(path):
        from scraperai.models import ScraperConfig
        with open(path) as fh:
            return ScraperConfig(**json.load(fh))
    return None


def _save_recipe(site: str, config) -> None:
    os.makedirs(RECIPES_DIR, exist_ok=True)
    path = os.path.join(RECIPES_DIR, f"{site}.json")
    data = config.model_dump(mode="json") if hasattr(config, "model_dump") else config.dict()
    with open(path, "w") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"  saved recipe -> {os.path.relpath(path, HERE)}")


def detect_recipe(url: str, crawler, api_key: str):
    """Use ParserAI to auto-build a ScraperConfig from a listing page."""
    from scraperai import ParserAI
    from scraperai.models import ScraperConfig

    parser = ParserAI(openai_api_key=api_key)
    crawler.get(url)
    html = parser.summarize_details_page_as_valid_html(crawler.page_source) \
        if False else crawler.page_source  # keep raw; summarise only if needed

    page_type = parser.detect_page_type(page_source=html)
    pagination = parser.detect_pagination(html)
    catalog = parser.detect_catalog_item(html, url)
    # Describe what we want pulled from each catalog card / details page.
    fields = parser.find_fields(
        html,
        "the thread/topic title, the dates mentioned, and the full discussion text",
    )
    print(f"  detected: page_type={page_type} pagination={getattr(pagination,'type',None)} "
          f"catalog={'yes' if catalog else 'no'} "
          f"fields={[f.field_name for f in getattr(fields,'static_fields',[])]}")
    return ScraperConfig(
        start_url=url,
        page_type=page_type,
        pagination=pagination,
        catalog_item=catalog,
        open_nested_pages=bool(catalog),  # catalog -> open each thread (details)
        fields=fields,
        max_pages=50,
        max_rows=10_000,
    )


# Map ScraperAI's detected field dict -> our raw shape. Adjust per source after
# the first run prints the field names.
def _row_to_raw(row: dict, url: str, site: str) -> dict | None:
    title = row.get("title") or row.get("Title") or ""
    # Join everything else as the post body; strip obvious empties.
    parts = [str(v) for k, v in row.items() if k not in ("title", "Title", "url") and v]
    text = re.sub(r"\s{2,}", " ", "\n\n".join(parts)).strip()
    if len(text) < 120:
        return None
    return {
        "source_site": site,
        "source_url": row.get("url") or url,
        "topic_id": None,
        "title": title,
        "created_at": "",
        "posts_count": None,
        "posts": [{"date": "", "text": text}],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="ScraperAI harvester for HTML-only AU sources.")
    ap.add_argument("--url", required=True, help="listing/catalog page URL")
    ap.add_argument("--site", required=True, help="source_site label, e.g. example.com")
    ap.add_argument("--max-rows", type=int, default=30)
    ap.add_argument("--redetect", action="store_true", help="ignore saved recipe")
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: export OPENAI_API_KEY first (from immi-pulse-be/.env).", file=sys.stderr)
        return 2

    try:
        from scraperai import Scraper, SeleniumCrawler
    except ImportError:
        print("ERROR: run with the scraper venv: "
              "scripts/scraping/.venv-scraper/bin/python", file=sys.stderr)
        return 2

    driver = _build_driver()
    crawler = SeleniumCrawler(driver)
    try:
        config = None if args.redetect else _load_recipe(args.site)
        if config is None:
            print(f"[scraperai] detecting recipe for {args.url} ...")
            config = detect_recipe(args.url, crawler, api_key)
            _save_recipe(args.site, config)
        config.max_rows = args.max_rows

        raw = []
        if os.path.exists(RAW_PATH):
            raw = json.load(open(RAW_PATH))
        existing_urls = {r.get("source_url") for r in raw}

        scraper = Scraper(config, crawler)
        added = 0
        for row in scraper.scrape():
            rec = _row_to_raw(row, args.url, args.site)
            if rec and rec["source_url"] not in existing_urls:
                raw.append(rec)
                existing_urls.add(rec["source_url"])
                added += 1
                print(f"  + [{added}/{args.max_rows}] {rec['title'][:60]!r}")
            if added >= args.max_rows:
                break

        with open(RAW_PATH, "w") as fh:
            json.dump(raw, fh, ensure_ascii=False, indent=2)
        print(f"[scraperai] wrote {added} raw rows -> {os.path.relpath(RAW_PATH, HERE)}")
    finally:
        driver.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
