#!/bin/bash
# Lane 1: run the domain tests and Jest in other time zones (CI pins domain to Australia/Sydney, jest to nothing).
cd /Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120 || exit 1
E=docs/audits/2026-11-20-deep-audit/evidence/L1
: > $E/tz-exitcodes.txt
for tz in UTC Australia/Brisbane America/New_York; do
  n=$(echo $tz | tr '/' '-')
  TZ=$tz npm run test:domain > $E/tz-domain-$n.log 2>&1
  echo "domain $tz exit=$?" >> $E/tz-exitcodes.txt
  TZ=$tz npx jest > $E/tz-jest-$n.log 2>&1
  echo "jest $tz exit=$?" >> $E/tz-exitcodes.txt
done
echo ALLDONE >> $E/tz-exitcodes.txt
