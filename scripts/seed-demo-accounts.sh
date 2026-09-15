#!/usr/bin/env bash
# Seeds demo accounts with example data against a running deployment, via
# the same REST API a real browser uses (not direct DB writes) — so every
# insert goes through the app's own validation and gating rules.
#
# Usage: BASE_URL=http://54.197.189.96 ./scripts/seed-demo-accounts.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSWORD="DemoPass123!"

signup() {
  local email="$1"
  curl -s -c "/tmp/seed_cookies_${email}.txt" -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PASSWORD}\"}"
}

api() {
  local email="$1" method="$2" path="$3" body="$4"
  curl -s -b "/tmp/seed_cookies_${email}.txt" -X "$method" "$BASE_URL$path" \
    -H "Content-Type: application/json" ${body:+-d "$body"} \
    -H "Authorization: Bearer $(cat "/tmp/seed_token_${email}.txt")"
}

seed_user() {
  local email="$1" mood="$2" anxiety="$3" energy="$4" career="$5" phase="$6"

  echo "--- $email ---"
  local signup_resp
  signup_resp=$(signup "$email")
  echo "$signup_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])" \
    > "/tmp/seed_token_${email}.txt" 2>/dev/null \
    || { echo "signup failed or already exists, skipping seed: $signup_resp"; return; }

  api "$email" POST /api/baseline "{
    \"mood\": $mood, \"anxiety\": $anxiety, \"energy\": $energy,
    \"sleep_quality\": \"fair\", \"meds_adherence_2wk\": \"consistent\",
    \"career_example\": \"$career\",
    \"structure_example\": \"Uses a paper planner but forgets to check it most mornings.\",
    \"life_example\": \"Dishes pile up until there's no clean plate left, then does them all at once.\",
    \"what_works\": \"Body doubling and a visible timer.\",
    \"non_negotiables\": \"Medication at 8am, no exceptions.\",
    \"cadence\": \"daily\"
  }" > /dev/null
  echo "baseline seeded"

  api "$email" POST /api/tracking/entries "{
    \"category_key\": \"executive_function\", \"cadence\": \"daily\",
    \"period_start\": \"$(date +%F)\",
    \"payload\": {\"task_initiated\": true, \"planned_count\": 4, \"completed_count\": 3, \"took_longer_than_planned\": true}
  }" > /dev/null
  api "$email" POST /api/tracking/entries "{
    \"category_key\": \"mood_anxiety\", \"cadence\": \"daily\",
    \"period_start\": \"$(date +%F)\",
    \"payload\": {\"mood\": $mood, \"anxiety\": $anxiety, \"sleep_quality\": \"fair\", \"panic_or_shutdown\": false}
  }" > /dev/null
  echo "tracking entries seeded"

  api "$email" POST /api/checkins "{
    \"date\": \"$(date +%F)\", \"mood\": $mood, \"anxiety\": $anxiety, \"meds\": true,
    \"sleep\": \"6.5 hours, woke up twice\",
    \"last_homework_status\": \"partial\",
    \"last_homework_note\": \"Did the morning routine 4 of 7 days.\",
    \"gap_reflection\": \"Mornings without a set alarm slipped the most.\",
    \"what_worked\": \"Timer-based task blocks.\",
    \"what_didnt\": \"Open-ended afternoon time.\",
    \"pattern_flagged\": \"Avoidance around unstructured time.\",
    \"roadmap_phase_name\": \"$phase\",
    \"next_homework\": \"Set a recurring alarm for the morning routine.\",
    \"next_homework_due\": \"$(date -d '+3 days' +%F 2>/dev/null || date -v+3d +%F)\"
  }" > /dev/null
  echo "checkin seeded"
}

seed_user "demo.adhd@therapist.app" 6 5 4 \
  "Misses deadlines when a task has more than two steps and no external reminder." \
  "Phase 1 — Stabilize"

seed_user "demo.ocd@therapist.app" 5 7 5 \
  "Re-checks submitted work repeatedly before feeling able to move on to the next task." \
  "Phase 2 — Build"

seed_user "demo.both@therapist.app" 4 6 3 \
  "Starts a checking ritual, loses track of time, then misses the actual deadline entirely." \
  "Phase 1 — Stabilize"

# Fourth persona: freshly signed up, no data yet — demonstrates the
# onboarding/gating flow (baseline required before check-ins unlock).
signup "demo.new@therapist.app" > /dev/null
echo "--- demo.new@therapist.app --- (signup only, no baseline — demonstrates onboarding gate)"

echo "Done."
