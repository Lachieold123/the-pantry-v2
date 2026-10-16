#!/usr/bin/env bash
# Re-does the batch-04 merge when the slice branches gain commits. Run it from the
# merge worktree (~/Developer/the-pantry-v2-b04-merge, branch house-recipes-batch-04-merge):
#
#   scripts/merge-batch04.sh
#
# 1. Merges the current tips of house-recipes-batch-04-sA, -sB and -sC, one at a time.
#    Conflicts in recipe data or the slice handoff docs take the slice's version: steps 2
#    and 3 re-derive everything this branch changed in them. The slices' scratch tools
#    (scripts/zz-*, docs/tools-s*) are kept out of this branch: removed after each merge.
#    Any other conflict stops the script for a person to look at.
# 2. Renormalises nutrition over every batch-04 file (--write), then rebuilds from the
#    ingredient lines any recipe still failing the nutrition checks
#    (scripts/fix-nutrition-from-lines.mts --write).
# 3. Drops duplicates (scripts/dedupe-batch04.mts --write) and rewrites docs/DEDUPE-BATCH04.md.
# 4. Runs catalogue:validate (batch-04 files) and catalogue:check-house, printing summary lines only.
# 5. Commits the result on this branch. Never pushes and never touches main.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
[ "$(git branch --show-current)" = house-recipes-batch-04-merge ] || { echo "run this on house-recipes-batch-04-merge"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "working tree has uncommitted changes: commit or stash first"; exit 1; }
[ -e node_modules ] || { echo "node_modules missing (symlink it from ~/Developer/the-pantry-v2-batch04)"; exit 1; }

out="${TMPDIR:-/tmp}/batch04-merge"
mkdir -p "$out"

for s in sA sB sC; do
  b="house-recipes-batch-04-$s"
  if git merge-base --is-ancestor "$b" HEAD; then echo "$b: nothing new"; continue; fi
  echo "$b: merging $(git rev-list --count HEAD.."$b") new commit(s)"
  if ! git merge --no-edit -q "$b"; then
    while IFS= read -r f; do
      case "$f" in
        scripts/data/house-recipes/batch-04*.json | docs/HANDOFF-BATCH04-s*.md)
          git checkout --theirs -- "$f" && git add -- "$f" ;;
        docs/tools-s*/* | scripts/zz-*)
          git rm -q --ignore-unmatch -- "$f" ;;
        *) echo "conflict needs a person: $f (merge left in progress)"; exit 1 ;;
      esac
    done < <(git diff --name-only --diff-filter=U)
    git commit --no-edit -q
  fi
  scratch=$(git ls-files -- 'scripts/zz-*' 'docs/tools-s*')
  if [ -n "$scratch" ]; then
    # shellcheck disable=SC2086
    git rm -rq -- $scratch
    git commit -q -m "batch-04 merge: keep $s scratch tools (scripts/zz-*, docs/tools-s*) out of this branch"
  fi
done

echo "-- renormalise nutrition"
npx tsx scripts/renormalise-nutrition.mts --write --report "$out/renormalise.txt" | tail -1
npx tsx scripts/fix-nutrition-from-lines.mts --write --report "$out/fix-nutrition.txt" | tail -1

echo "-- dedupe"
npx tsx scripts/dedupe-batch04.mts --write --report docs/DEDUPE-BATCH04.md | tail -2

echo "-- validate (full findings: $out/validate.txt)"
files=$(ls scripts/data/house-recipes | grep '^batch-04')
# shellcheck disable=SC2086
npx tsx scripts/validate-house-recipes.mts $files --report "$out/validate.txt" > "$out/validate.out" 2>&1 || true
grep -E '^(PASS|Recipes failing)' "$out/validate.out" || tail -3 "$out/validate.out"

echo "-- check-house"
if npx tsx scripts/check-house-recipes.mts > "$out/check-house.txt" 2>&1; then tail -1 "$out/check-house.txt"; else
  echo "check-house FAILED:"; grep -iE 'error|problem|fail' "$out/check-house.txt" | head -20
fi

if git diff --quiet; then echo "nothing to commit"; exit 0; fi
git add scripts/data/house-recipes docs/DEDUPE-BATCH04.md
git commit -q -m "batch-04 merge: re-run renormalise and dedupe after slice merges" \
  -m "$(grep -E '^PASS' "$out/validate.out" || true)"
git log --oneline -1
