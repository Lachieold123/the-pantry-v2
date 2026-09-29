# Known issues

Things deliberately deferred. Each has a phase in which it gets fixed. Nothing here blocks the current phase unless marked **blocking**.

| # | Issue | Why it's deferred | Fix in |
|---|---|---|---|
| K-1 | Claude's cloud workspace can't download packages; the Mac mini's workspace can, so builds happen there (D-020). `expo-doctor` can't reach Expo's servers from either, so two of its 21 checks can't run. | Network settings. Run `npx expo-doctor` on the Mac itself once to confirm. | Phase 1 close |
| K-2 | Scaled counts keep the recipe's own wording: "3 large onions" scaled to one reads "1 large onions". | Needs singular/plural forms per ingredient line, best done with the recipe page. | Phase 3 |
| K-3 | 281 ingredient lines name two options ("beef or lamb mince"). The shopping list and diets use the first-named option. | Correct and cautious; rewriting lines is part of vetting. `docs/reports/catalogue-report.md` lists them. | Recipe vetting |
| K-4 | Recipe times and missing ingredients flagged in `scripts/data/recipe-tags-notes.md` (e.g. gnocchi's cook time, butter used but not listed) aren't fixed yet. | They need a cook's judgement; fix via `recipe-fixes.json` while cook-testing. | Recipe vetting |
| K-5 | Nutrition isn't converted yet. The old engine's per-ingredient data needs linking to the new ingredient database ids. | Not needed until the recipe page. | Phase 3 |
| K-6 | Cuisine calls marked "unsure" in `recipe-tags-notes.md` (Tex-Mex, Italian-American, Hawaiian) need Lachlan's view. | Editorial choice. | Recipe review |
| K-7 | On the web preview the tab labels' descenders ("Today", "Shop") are slightly clipped. | Web-only layout; check on the phone before changing anything. | Phase 1 phone check |
| K-8 | Sentry isn't set up: it needs a Sentry account and project (the map wants a DSN from the first build). | Needs Lachlan to create the project. | Before first TestFlight |
| K-9 | Cook Mode moves on by tapping the screen or Next; swiping between steps isn't built yet. | Tap works one-handed with messy fingers; swipe needs a gesture library check on the phone first. | Phase 9 |
| K-10 | Component and journey test coverage is thin: 3 component tests, no Maestro flows yet. The domain maths is well covered (97 tests). | Maestro needs Xcode's simulator, which was still installing. | Phase 9 (start once Xcode is ready) |
