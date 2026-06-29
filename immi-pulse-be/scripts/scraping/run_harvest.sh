#!/usr/bin/env bash
#
# Orchestrate the community-data harvest loop: harvest -> normalise -> seed.
# Safe to run repeatedly (idempotent): each run pulls only NEW AU topics, the
# normaliser dedups by source_url, and the seeder reloads the full grown set.
#
#   Stage A  harvest.py   myimmitracker Discourse JSON -> data/harvested_raw.json
#   Stage B  normalize.py raw -> scraped_journeys.json (paraphrase/anonymise/map)
#   Stage C  seed_community_scraped.py --force  -> DB (is_sample=True, stats-isolated)
#
# Usage:
#   scripts/scraping/run_harvest.sh                 # local DB (from .env)
#   MAX_TOPICS=80 scripts/scraping/run_harvest.sh   # bigger batch
#   SEED=0 scripts/scraping/run_harvest.sh          # harvest+normalise only, no DB write
#
# Seed PRODUCTION (do this deliberately, after a clean local run):
#   DATABASE_URL='postgresql+asyncpg://USER:PASS@HOST:5432/DB?ssl=require' \
#     scripts/scraping/run_harvest.sh
#   (pydantic-settings lets the env var override .env. Or run Stage C on Heroku.)
#
set -euo pipefail

# --- resolve paths (works from cron/launchd with no cwd) ---------------------
SCRAPING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_DIR="$(cd "$SCRAPING_DIR/../.." && pwd)"
PY="$BE_DIR/.venv/bin/python"
# Git repo root (monorepo) + the tracked data file path relative to it.
BE_REPO="$(cd "$BE_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$BE_DIR")"
DATA_ABS="$BE_DIR/scripts/scraped_journeys.json"
DATA_REL="${DATA_ABS#"$BE_REPO"/}"   # path relative to repo root (portable)
LOG_DIR="$SCRAPING_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/harvest-$(date +%Y%m%d).log"

# --- tunables ----------------------------------------------------------------
MAX_TOPICS="${MAX_TOPICS:-40}"      # new topics harvested per run (caps LLM spend)
MAX_POSTS="${MAX_POSTS:-12}"        # posts kept per topic
MIN_CONFIDENCE="${MIN_CONFIDENCE:-0.55}"
SEED="${SEED:-1}"                   # 1 = write to DB (Stage C); 0 = skip

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

{
  log "=== harvest loop start (max_topics=$MAX_TOPICS seed=$SEED db=${DATABASE_URL:-<.env>}) ==="

  if [[ ! -x "$PY" ]]; then
    log "FATAL: backend venv python not found at $PY"; exit 1
  fi

  log "Stage A — harvest (myimmitracker Discourse JSON)"
  "$PY" "$SCRAPING_DIR/harvest.py" --max-topics "$MAX_TOPICS" --max-posts "$MAX_POSTS" 2>&1 | tee -a "$LOG_FILE"

  log "Stage B — normalise (OpenAI -> scraped_journeys.json)"
  ( cd "$BE_DIR" && PYTHONPATH=src "$PY" scripts/scraping/normalize.py --min-confidence "$MIN_CONFIDENCE" ) 2>&1 | tee -a "$LOG_FILE"

  if [[ "$SEED" == "1" ]]; then
    log "Stage C — seed DB (--force; is_sample=True, stats-isolated)"
    ( cd "$BE_DIR" && PYTHONPATH=src "$PY" scripts/seed_community_scraped.py --force ) 2>&1 | tee -a "$LOG_FILE"
  else
    log "Stage C — skipped (SEED=0)"
  fi

  # Optional: stage the grown data file for the next deploy. Safe by design —
  # commits ONLY scripts/scraped_journeys.json, ONLY on the main branch, and
  # NEVER pushes (the data reaches prod on your next backend deploy).
  if [[ "${COMMIT:-0}" == "1" ]]; then
    BRANCH="$(cd "$BE_REPO" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    if [[ "$BRANCH" == "main" ]]; then
      if ( cd "$BE_REPO" && ! git diff --quiet -- "$DATA_REL" ); then
        N="$(cd "$BE_DIR" && "$PY" -c "import json;print(len(json.load(open('scripts/scraped_journeys.json'))))")"
        ( cd "$BE_REPO" && git add "$DATA_REL" \
          && git -c user.name='immi-pulse harvester' -c user.email='munsif@horizondigital.au' \
               commit -m "chore(community): refresh aggregated visa timelines ($N records)" ) 2>&1 | tee -a "$LOG_FILE"
        log "committed $DATA_REL on main (not pushed — deploy when ready)"
      else
        log "no change to $DATA_REL — nothing to commit"
      fi
    else
      log "COMMIT=1 but branch is '$BRANCH' (not main) — leaving data file modified, not committing"
    fi
  fi

  log "=== harvest loop done ==="
} 2>&1
