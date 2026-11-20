#!/bin/bash
# Lane 1 baseline runner. Each step logs to evidence/L1/<name>.log and appends exit code to evidence/L1/exitcodes.txt
cd /Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120 || exit 1
E=docs/audits/2026-11-20-deep-audit/evidence/L1
mkdir -p $E
: > $E/exitcodes.txt
run() {
  name=$1; shift
  s=$(date +%s)
  "$@" > $E/$name.log 2>&1
  c=$?
  echo "$name exit=$c secs=$(( $(date +%s) - s ))" >> $E/exitcodes.txt
}
run typecheck npm run typecheck
run lint npm run lint
run format npm run format:check
run cat-house npm run catalogue:check-house
run cat-text npm run catalogue:check-text
run cat-ingredients npm run catalogue:check-ingredients
run cat-validate npm run catalogue:validate -- --no-nutrition
run cat-validate-full npm run catalogue:validate
run feed-verify npm run feed:verify
run domain env TZ=Australia/Sydney npm run test:domain
run jest1 npx jest
run jest2 npx jest
run audit npm audit --json
run doctor npx expo-doctor
run installcheck npx expo install --check
export EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1
run export npx expo export --platform web --clear
run testweb npm run test:web
echo ALLDONE >> $E/exitcodes.txt
