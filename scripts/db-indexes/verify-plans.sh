#!/usr/bin/env bash
# Re records the leaderboard query plan beside the build log, per AC-10.
# Usage: ./scripts/db-indexes/verify-plans.sh [before|after|both]
# Needs DATABASE_URL in the environment, reads it from .env when present.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-both}"

run_plan() {
  local out="$1"
  npx tsx "$HERE/verify-leaderboard-plan.ts" > "$out"
  echo "wrote $out"
}

if [ "$MODE" = "before" ] || [ "$MODE" = "both" ]; then
  run_plan "$HERE/plans/leaderboard-before.txt"
fi
if [ "$MODE" = "after" ] || [ "$MODE" = "both" ]; then
  run_plan "$HERE/plans/leaderboard-after.txt"
fi
