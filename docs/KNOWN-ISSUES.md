# Known issues

Things deliberately deferred. Each has a phase in which it gets fixed. Nothing here blocks the current phase unless marked **blocking**.

| # | Issue | Why it's deferred | Fix in |
|---|---|---|---|
| K-1 | **Blocking for Phase 1:** the build workspace can't download packages (npm is blocked by the account's network settings), so the Expo app can't be created there yet. | Needs Lachlan to allow package managers, then a fresh session. | Phase 1 |
| K-2 | Scaled counts keep the recipe's own wording: "3 large onions" scaled to one reads "1 large onions". | Needs singular/plural forms per ingredient line, best done with the recipe page. | Phase 3 |
| K-3 | 281 ingredient lines name two options ("beef or lamb mince"). The shopping list and diets use the first-named option. | Correct and cautious; rewriting lines is part of vetting. `docs/reports/catalogue-report.md` lists them. | Recipe vetting |
| K-4 | Recipe times and missing ingredients flagged in `scripts/data/recipe-tags-notes.md` (e.g. gnocchi's cook time, butter used but not listed) aren't fixed yet. | They need a cook's judgement; fix via `recipe-fixes.json` while cook-testing. | Recipe vetting |
| K-5 | Nutrition isn't converted yet. The old engine's per-ingredient data needs linking to the new ingredient database ids. | Not needed until the recipe page. | Phase 3 |
| K-6 | Cuisine calls marked "unsure" in `recipe-tags-notes.md` (Tex-Mex, Italian-American, Hawaiian) need Lachlan's view. | Editorial choice. | Recipe review |
