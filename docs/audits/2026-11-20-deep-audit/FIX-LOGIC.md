# Logic fixes: 20 Nov 2026 deep audit

Branch `audit/deep-1120`. Each finding has a test that fails without its fix. One line per finding is in `FIX-LOGIC-STATUS.csv`.

## Findings

| ID | Status | Commit | What changed | Proving test |
|---|---|---|---|---|
| F-1 | fixed | 13d21b9 | `scaleLine` scales the "+ N" part of an item, measured amounts in the prep, and the note when it is a total, not per item. | `src/domain/ingredients/format.test.ts` |
| F-2 | fixed | 13d21b9 | A tiny amount prints as the smallest fraction (⅛, or ¼ for quarters) or 0.1, never 0. Metric kg and l under 1 show as g and ml. | same |
| F-3 | part-fixed | 864d47f | `avoidNotice` (domain) and `AvoidNote` on the recipe and published-recipe pages. They warn when something is avoided, and name the lines that couldn't be checked against the avoid list. The missing database words are for the recipe fixer. | `avoidNotice.test.ts`, `AvoidNote.test.tsx` |
| F-12 | fixed | 2102641 | "45 min to 1 hour" makes one timer (the longer end), and so does "1 minute 30 seconds". | `cook.test.ts` |
| F-13 | fixed | c7c5cc3 | Search ignores "and" and "n" between words. | `recipes.test.ts` |
| F-11 | fixed | 6ec0a07 | `clampServings` keeps 1–24 and the steppers stop at 24. `plannableDay` only lets a link plan from today to the end of next week. | `servings.test.ts`, `week.test.ts` |
| F-4 / REL2-7 | fixed | c456732 | The trial is shown only when RevenueCat says the buyer is eligible. If the check fails, no trial is shown. | `purchase.test.ts`, `src/lib/purchases.test.tsx` |
| F-6 | fixed | cf0c7d8 | Leaving Cook Mode (close or Done) with a timer running asks first: "Leave anyway". | `CookDone.test.tsx` |
| F-7 | fixed | cf0c7d8 | Undo on the finish toast puts the used-up items back in the cupboard. | `CookDone.test.tsx` |
| UX-8 | fixed | cf0c7d8 | Each timer chip reads as one element: "label, step n, 3:20 left". The button names its timer. The chatty live region is gone. | `CookControls.test.tsx` |
| F-8 | fixed | 4c007ff | The my-recipes allowance is checked in `useRecipeEditor`'s save, the one place every new recipe is made. The orphan `/my-recipe/import` sheet checks it too, along with the imports allowance. Over the limit, the paywall opens and the draft stays. | `RecipeEditorScreen.test.tsx` |
| UX-4 | fixed | c590431 | `toDraftProblem` has plain words for every rule. Anything unknown gets a plain fallback, never the field name. | `draft.test.ts`: breaks every rule and fails on code words |
| F-10 | fixed | f606ccf | `entriesWithRecipes` (domain): Plan's "N of 21 meals" leaves out gone recipes. The Collect sheet says "isn't available any more" instead of offering to collect nothing. | `week.test.ts`, `CollectSheet.test.tsx` |
| F-15 | fixed | 1788d78 | `skillLift`: a confident cook gets 4 steps on a hard dish (was 1). Measured with `tools/L2/skill-weight.ts`: Saturday 9am shows 9 hard dishes in the top 25. Tuesday 6pm shows none, because the existing weeknight hard-dish penalty still applies. Beginners and Comfortable are unchanged. Probe: `tools/FIX-LOGIC/skill-probe.ts`. | `onboarding.test.ts` |
| REPO-12 | fixed | ba1a812 | New `home-engine/stages.test.ts` covers the logistic heads, decay, pantry share, time buckets, the cook and cuisine run limits, the page cap, the explore slot and the limit. | itself |
| F-9 | fixed | fe7198f | The library journey test looks inside the Recent and Cookmarks tabs, not at the Home card mounted underneath. | `e2e/web/library.spec.ts` |
| UX-7 | part-fixed | d9830f5 | A Cook button on each upcoming planned meal opens Cook Mode for the planned number of serves. "Fill the week" is left for the owner. | `e2e/web/plan-and-list.spec.ts` |
| PERF-4 | not real (for now) | 2ce2c89 | Measured with `tools/FIX-LOGIC/list-rows.ts`. Over 50 full weeks (21 meals, empty cupboard) the list had 82–138 rows (median 104), and deriving it took 7 ms at most. A plain list copes with that, so virtualising isn't worth it yet. Recheck on the phone with K-39. The cupboard list isn't in this lane. | the tool |
| S2-13 (editor half) | fixed | 20bd92c | Typed or pasted ingredients and method stop at `MAX_IMPORTED_TEXT` (8,000, the data fixer's constant), and notes at a quarter of that, so a recipe always fits a backed-up row. | `RecipeEditorScreen.test.tsx` |

Skipped as briefed: F-5, F-14 (other fixers).

## Decisions taken

- **F-1 notes:** a note scales when it is a total. It counts as per item when it says "each" or "per", or when the line is a count and the note isn't an "or…" alternative or a "total".
- **F-4:** the mock store answers "eligible" by default, so the existing tests keep their trial wording. In the real app, no answer means no trial is claimed.
- **F-7:** Undo re-adds the items with source `manual`.
- **F-3:** unchecked lines are named on the page; no word lists in code. The database is the one source of truth.
- **F-11:** a link can plan from today to the end of next week (what Plan shows). Anything else falls back to today. Servings are capped at 24.
- **F-8:** the check counts only new recipes; edits are always allowed. The orphan import route is guarded, not deleted.
- **F-15:** the lift is 4 steps, not the 2 the audit suggested. Measured: 2 and 3 steps still gave 0–1 hard dishes in the top 25. The weeknight hard-dish penalty stays, so a confident cook's Tuesday stays practical.
- **S2-13:** the notes cap is 2,000 characters. Everything at 3 bytes a character then stays under the 60 KB row.
- **UX-7:** the Cook button sits beside the remove button on upcoming meals only (not past days).

## Lines for the screens fixer

- `src/features/shell/useCounts.ts:14`: the Plan badge should count `entriesWithRecipes(s.entries, (id) => getRecipe(id) !== undefined)`, as PlanScreen now does (F-10).
- `src/features/shell/DrawerScreen.tsx:102`: "Add a recipe" opens the editor without a check. That is now safe, because the editor's save checks the allowance (F-8). A check there would only open the paywall sooner.
- `src/features/plan/DaySlots.tsx`: the new Cook icon wants a light and dark screenshot check (UX-7).

## Known issues that should change

- **K-38:** the trial wording is now eligibility-checked (F-4). What's left is unchanged: a sandbox wording check.
- **K-39:** the timer chips' VoiceOver reading changed (UX-8). Include them in the next phone check.

## For the owner

- **UX-7 "Fill the week":** the plan takes about 15 taps to fill. Auto-filling it from Home's ranking is a product decision.

## Final checks

- typecheck: clean. lint: clean.
- npm test: domain 623 passed, 0 failed; Jest 288 passed in 57 suites.
- export:web (EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1): built.
- test:web: 52 passed, 6 failed (one library check that was mine, since fixed: library.spec 12/12 on rerun). The other 4 failures are household tests in `audit-fixes.spec.ts:25` and `pro-and-household.spec.ts:37`, light and dark. They look for `household-remove-s` and "Lachlan (you)". Household isn't my lane, so they're noted for the account and household fixer.
