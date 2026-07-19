"""Fetch the Home Affairs skilled occupation list (ANZSCO).

Sibling of ``fetch_dha_taxonomy.py``, same contract: hit a Home Affairs source,
normalise it, write a **snapshot committed to the repo**
(``scripts/dha_occupations.json``) that ``seed_occupations.py`` loads. Never a
live call at request time — Akamai rate-limits, a blocked run must not empty the
table, and a reviewable diff of "what the department changed this quarter" is
worth having.

Unlike the taxonomy, there is no JSON API here. The department's occupation
search is a client-side widget and the *entire* dataset — 714 records — is
embedded in the page HTML as an HTML-escaped JSON array. So: fetch the page,
find the ``[{"occupation`` marker, HTML-unescape, ``json.loads``. Fragile by
nature, which is why every field is validated and a short read aborts rather
than writing a truncated snapshot.

Run:    python scripts/fetch_dha_occupations.py [--out PATH] [--dry-run]
Then:   PYTHONPATH=src python scripts/seed_occupations.py

Gotchas encoded below, all found the hard way:

  * Requires a browser User-Agent + Referer. Without them: 403.

  * **The two-version trap.** Home Affairs runs two ANZSCO editions at once and
    says so verbatim in the markup: ANZSCO **2022** for subclass 186 and 482
    (which is all of CSOL), ANZSCO **2013** for every other skilled subclass.
    416 occupations carry both codes and 409 of those are identical, so the trap
    is invisible until you hit one of the **7 that differ** — Arborist, Flower
    Grower, Landscape Gardener, Management Consultant, Plumber (General),
    Statistician, Zoologist. Store both codes; resolve on the subclass. Pick one
    edition and those seven mis-bucket silently forever.

  * The applicability is parsed out of the anchor text ("ANZSCO 2022 - Subclass
    186 and 482 visas - 221111") rather than hardcoded, so the rule lives in the
    data. Four spellings of that label are in the wild, one of them containing a
    zero-width space — hence the aggressive whitespace normalisation.

  * Codes and assessing authorities arrive wrapped in anchor tags. Strip tags
    before matching: the ``aria-label`` repeats the code, so matching the raw
    HTML double-counts every row.

  * ANZSCO codes are 6-digit strings and the leading digit is the major group.
    Never parse them as integers — ``'121212'`` is fine but the four-digit unit
    group prefixes are not, and the department's own URLs disagree on padding.

  * The 23 ``RSMS ROL`` rows carry an **empty** ``visas`` field. That list is the
    subclass 187 Regional Sponsored Migration Scheme occupation list, so they are
    attributed to 187 explicitly. Without this, 187 — a visa that unambiguously
    has a nominated occupation — would come out needing none.

  * OSCA is a red herring. The ABS retired ANZSCO in favour of OSCA, but Home
    Affairs has not adopted it and only 6 of the 456 CSOL codes exist there.
    Build on ANZSCO; revisit in 2027.
"""

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

SOURCE = "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list"
REFERER = "https://immi.homeaffairs.gov.au/visas/working-in-australia"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
DEFAULT_OUT = os.path.join(os.path.dirname(__file__), "dha_occupations.json")

THROTTLE_SECONDS = 1.5

# Where the embedded array starts in the page HTML. Escaped because the whole
# payload is HTML-encoded inside an attribute.
MARKER = "[{&quot;occupation"

# A blocked or restructured page must not be mistaken for "the department
# retired 700 occupations". Anything under this aborts before writing.
MIN_RECORDS = 600

# ANZSCO major groups — the first digit of every code. This is the grouping the
# picker renders under, and it is the whole reason we extract codes rather than
# storing the department's flat alphabetical list: a member scanning 457
# occupations for subclass 186 needs "Professionals" before they need
# "Aboriginal and Torres Strait Islander Education Worker".
#
# 7 and 8 are listed for completeness and currently match zero rows — no
# machinery operator or labourer occupation is on any skilled list.
MAJOR_GROUPS = {
    "1": "Managers",
    "2": "Professionals",
    "3": "Technicians and Trades Workers",
    "4": "Community and Personal Service Workers",
    "5": "Clerical and Administrative Workers",
    "6": "Sales Workers",
    "7": "Machinery Operators and Drivers",
    "8": "Labourers",
}

# The occupation list names subclass 187 only through its list label; its rows
# carry no ``visas`` value at all. See the module docstring.
LIST_SUBCLASS_FALLBACK = {"RSMS ROL": ["187"]}

# Subclasses that appear in the occupation data but are not in our visa
# taxonomy. 489 was repealed in 2019 and replaced by 491; nobody can lodge one.
# Dropped rather than silently carried, so the seeder never writes a
# requires_occupation flag for a visa that has no row to hang it on.
REPEALED_SUBCLASSES = {"489"}

_TAG_RE = re.compile(r"<[^>]+>")
# The separator after the edition year is hand-typed and inconsistent: most rows
# use an ASCII hyphen, "Arborist" uses an en dash. Matching only "-" drops that
# row — and Arborist is one of the seven occupations whose 2013 and 2022 codes
# actually differ, so it is precisely the row you cannot afford to lose.
_DASH = r"[-‐‑‒–—―]"
_ANZSCO_RE = re.compile(rf"ANZSCO\s*(2013|2022)\s*{_DASH}\s*(.*?)(\d{{6}})")
_HREF_RE = re.compile(r"href='(https?[^']+)'")


def _get(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Referer": REFERER,
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_page() -> str:
    """GET the occupation list page, with the same 3-attempt backoff as the
    taxonomy fetcher. One page, but it is 3.4 MB behind Akamai."""
    for attempt in range(3):
        try:
            print(f"→ GET {SOURCE}", file=sys.stderr)
            body = _get(SOURCE)
            print(f"  {len(body):,} bytes", file=sys.stderr)
            return body
        except (urllib.error.HTTPError, urllib.error.URLError) as exc:
            wait = 4 * (attempt + 1)
            print(f"  retry in {wait}s ({exc})", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("occupation list page failed after 3 attempts")


def extract_array(page: str) -> list[dict]:
    """Pull the embedded JSON array out of the page HTML.

    Scans for the array's own closing bracket rather than trusting a regex —
    occupation names contain brackets, and ``visacaveats`` contains whole HTML
    documents. String-awareness is what keeps that from truncating the payload
    three rows in.
    """
    start = page.find(MARKER)
    if start < 0:
        raise RuntimeError(
            f"marker {MARKER!r} not found — the page structure changed; "
            "nothing written"
        )
    text = html.unescape(page[start:])

    depth = 0
    in_string = False
    end = None
    for i, ch in enumerate(text):
        if ch == '"' and (i == 0 or text[i - 1] != "\\"):
            in_string = not in_string
        if in_string:
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise RuntimeError("embedded array never closes — truncated response")
    return json.loads(text[:end])


def _plain(fragment: str) -> str:
    """Anchor soup -> flat text. Tags first, then entities, then whitespace.

    Order matters: unescaping before stripping would turn escaped angle
    brackets inside the payload into tags and eat real text. The final
    normalisation also collapses the zero-width space that appears in one of the
    department's four spellings of the 2022 applicability label.
    """
    text = _TAG_RE.sub(" ", fragment or "")
    text = html.unescape(text)
    text = text.replace("​", "")
    return re.sub(r"\s+", " ", text).strip()


def parse_codes(fragment: str) -> tuple[dict[str, str], list[str]]:
    """-> ({"2013": "221111", "2022": "221111"}, ["186", "482"]).

    The second value is the set of subclasses the *2022* edition applies to,
    read from the department's own label rather than hardcoded. Empty when the
    occupation carries a single edition that applies everywhere.
    """
    plain = _plain(fragment)
    codes: dict[str, str] = {}
    applies_2022: list[str] = []
    for version, label, code in _ANZSCO_RE.findall(plain):
        codes.setdefault(version, code)
        if version == "2022":
            applies_2022 = sorted(set(re.findall(r"\b(\d{3})\b", label)))
    return codes, applies_2022


def parse_authority(fragment: str) -> tuple[str | None, str | None]:
    """-> ("VETASSESS", "https://www.vetassess.com.au/").

    The first anchor's text is the authority's acronym, which is what an
    applicant recognises; the long name follows inside a collapsed panel. 24 of
    714 rows name no authority (most ROL trades) — those return (None, None)
    rather than an empty string, so "unknown" and "none required" stay
    distinguishable downstream.
    """
    plain = _plain(fragment)
    if not plain:
        return None, None
    name = plain.split(" Assessing authority", 1)[0].strip() or None
    urls = _HREF_RE.findall(html.unescape(fragment or ""))
    return name, (urls[0] if urls else None)


def parse_subclasses(visas: str, lists: list[str]) -> list[str]:
    """Which visa subclasses this occupation is eligible for.

    Rows read like ``189 - Skilled Independent (subclass 189) - Points-Tested;``
    so the leading three digits of each semicolon-separated entry is the answer.
    Matching the *leading* number specifically: every entry repeats the number
    inside "(subclass NNN)", and several name a second subclass in prose.
    """
    out: list[str] = []
    for part in (visas or "").split(";"):
        m = re.match(r"^\s*(\d{3})\s*-", part)
        if m and m.group(1) not in out:
            out.append(m.group(1))
    if not out:
        for label in lists:
            for code in LIST_SUBCLASS_FALLBACK.get(label, []):
                if code not in out:
                    out.append(code)
    return [c for c in out if c not in REPEALED_SUBCLASSES]


def slugify(text: str) -> str:
    """Occupation names are unique across all 714 rows, so the slug is a safe
    natural key for the seeder to match on.

    Note this does *not* drop parenthetical asides the way the taxonomy's
    slugify does: "Accountant (General)" and "Accountant (Taxation)" are two
    different occupations with two different codes, and collapsing them would
    silently merge them.
    """
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def normalise(raw: list[dict]) -> list[dict]:
    seen: set[str] = set()
    rows: list[dict] = []
    for r in raw:
        name = (r.get("occupation") or "").strip()
        if not name:
            continue
        codes, applies_2022 = parse_codes(r.get("anzscocode", ""))
        if not codes:
            # Every skilled occupation has an ANZSCO code. A row without one is
            # a parse failure, not a data fact — surface it rather than seeding
            # an occupation nobody can ever match a subclass against.
            print(f"  ! no ANZSCO code for {name!r} — skipped", file=sys.stderr)
            continue

        slug = slugify(name)
        if slug in seen:
            print(f"  ! duplicate slug {slug!r} — skipped", file=sys.stderr)
            continue
        seen.add(slug)

        lists = [p.strip() for p in (r.get("list") or "").split(";") if p.strip()]
        authority, authority_url = parse_authority(r.get("assessauth", ""))
        primary = codes.get("2013") or codes.get("2022")

        rows.append(
            {
                "slug": slug,
                "name": name,
                "anzsco_2013_code": codes.get("2013"),
                "anzsco_2022_code": codes.get("2022"),
                # Grouping key for the picker. Taken from the 2013 code where
                # both exist: the two editions agree on the major group for
                # every row in the dataset, and 2013 has the wider coverage.
                "major_group_code": primary[0],
                "major_group_name": MAJOR_GROUPS.get(primary[0], "Other"),
                "lists": lists,
                "eligible_subclasses": parse_subclasses(r.get("visas", ""), lists),
                "assessing_authority": authority,
                "authority_url": authority_url,
                "anzsco_2022_subclasses": applies_2022,
            }
        )
    return sorted(rows, key=lambda x: x["name"].lower())


def build(rows: list[dict]) -> dict:
    """Wrap the rows with the two derived facts the seeder needs.

    Both are computed here, at fetch time, for the same reason
    ``cohort_split_by_stream`` is: they are conclusions about a dataset, and the
    seeder should apply a decision rather than re-derive one.
    """
    # Which subclasses read the 2022 edition. Read off the department's labels
    # (186 and 482), never assumed.
    version_2022: set[str] = set()
    for r in rows:
        version_2022.update(r["anzsco_2022_subclasses"])

    # Which subclasses have a nominated occupation at all. Derived from the data
    # rather than curated: a subclass that no occupation is eligible for has no
    # occupation to nominate, and asking a 600 Tourist applicant for an ANZSCO
    # code would poison the cohort it lands in.
    requires: set[str] = set()
    for r in rows:
        requires.update(r["eligible_subclasses"])

    for r in rows:
        r.pop("anzsco_2022_subclasses")

    return {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": SOURCE,
        "occupation_count": len(rows),
        "anzsco_2022_subclasses": sorted(version_2022),
        "requires_occupation_subclasses": sorted(requires),
        "occupations": rows,
    }


def summarise(snap: dict) -> None:
    rows = snap["occupations"]
    dual = [r for r in rows if r["anzsco_2013_code"] and r["anzsco_2022_code"]]
    diverging = [
        r for r in dual if r["anzsco_2013_code"] != r["anzsco_2022_code"]
    ]
    groups: dict[str, int] = {}
    for r in rows:
        groups[r["major_group_name"]] = groups.get(r["major_group_name"], 0) + 1

    print(f"\n{len(rows)} occupations", file=sys.stderr)
    print(
        f"dual-coded: {len(dual)} · diverging across editions: {len(diverging)}",
        file=sys.stderr,
    )
    for r in diverging:
        print(
            f"  {r['name']}: 2013={r['anzsco_2013_code']} "
            f"2022={r['anzsco_2022_code']}",
            file=sys.stderr,
        )
    print(
        f"2022 edition applies to: {', '.join(snap['anzsco_2022_subclasses'])}",
        file=sys.stderr,
    )
    print(
        f"subclasses requiring an occupation: "
        f"{', '.join(snap['requires_occupation_subclasses'])}",
        file=sys.stderr,
    )
    for name, n in sorted(groups.items(), key=lambda kv: -kv[1]):
        print(f"  {name}: {n}", file=sys.stderr)
    missing = sum(1 for r in rows if not r["assessing_authority"])
    print(f"no assessing authority named: {missing}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--dry-run", action="store_true", help="print summary, write nothing")
    args = ap.parse_args()

    page = fetch_page()
    time.sleep(THROTTLE_SECONDS)
    rows = normalise(extract_array(page))

    if len(rows) < MIN_RECORDS:
        print(
            f"refusing to write: only {len(rows)} occupations parsed "
            f"(expected >= {MIN_RECORDS}). The page was probably blocked or "
            "restructured — the existing snapshot is left untouched.",
            file=sys.stderr,
        )
        return 1

    snap = build(rows)
    summarise(snap)

    if args.dry_run:
        return 0
    with open(args.out, "w") as fh:
        json.dump(snap, fh, indent=2, sort_keys=False)
        fh.write("\n")
    print(f"wrote {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
