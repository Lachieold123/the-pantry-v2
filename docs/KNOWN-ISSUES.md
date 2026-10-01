# Known issues

Things deliberately deferred. Each has a phase in which it gets fixed. Nothing here blocks the current phase unless marked **blocking**.

| # | Issue | Why it's deferred | Fix in |
|---|---|---|---|
| K-1 | Claude's cloud workspace can't download packages; the Mac mini's workspace can, so builds happen there (D-020). `expo-doctor` can't reach Expo's servers from either, so two of its 21 checks can't run. | Network settings. Run `npx expo-doctor` on the Mac itself once to confirm. | Phase 1 close |
| K-3 | 281 ingredient lines name two options ("beef or lamb mince"). The shopping list and diets use the first-named option. | Correct and cautious; rewriting lines is part of vetting. `docs/reports/catalogue-report.md` lists them. | Recipe vetting |
| K-4 | Recipe times and missing ingredients flagged in `scripts/data/recipe-tags-notes.md` (e.g. gnocchi's cook time, butter used but not listed) aren't fixed yet. | They need a cook's judgement; fix via `recipe-fixes.json` while cook-testing. | Recipe vetting |
| K-5 | Nutrition isn't converted yet. The old engine's per-ingredient data needs linking to the new ingredient database ids. | Not needed until the recipe page. | Phase 3 |
| K-6 | Cuisine calls marked "unsure" in `recipe-tags-notes.md` (Tex-Mex, Italian-American, Hawaiian) need Lachlan's view. | Editorial choice. | Recipe review |
| K-7 | On the web preview the tab labels' descenders ("Today", "Shop") are slightly clipped. | Web-only layout; check on the phone before changing anything. | Phase 1 phone check |
| K-8 | Sentry isn't set up: it needs a Sentry account and project (the map wants a DSN from the first build). | Needs Lachlan to create the project. | Before first TestFlight |
| K-10 | Component and journey test coverage is thin: 3 component tests, no Maestro flows yet. The domain maths is well covered (97 tests). | Maestro needs Xcode's simulator, which was still installing. | Phase 9 (start once Xcode is ready) |
| K-11 | On the web preview, multi-line fields (ingredients, method) scroll inside a fixed box instead of growing. | Web-only; on phones they grow with the text. | Phase 9 if it shows on a phone |
| K-12 | The old-app import is tested with sample data only. It needs one run on a phone that has the old TestFlight build installed (map Phase 7 "done when"). | Needs Lachlan's phone. | Before first TestFlight |
| K-13 | An imported recipe keeps the link it came from, but the recipe page doesn't show it yet (only the editor does). | Small; wants a design for credits on your own recipes. | Phase 9 |

| K-14 | Scanning (D-030, D-032) is built but not switched on. The camera needs expo-image-picker (a native module), and reading photos needs our server and a vision model's API key. Until both are in, `SCAN_CONNECTED` is false and the sheet says "Coming soon". | Both need Lachlan's approval. | When Lachlan approves the module and the server |
| K-15 | Route sheets drew their body over the title on iOS (1 October screenshot). The fix puts the title inside the sheet's scroll view as a sticky header. That's checked on the web and in tests, but the overlap only ever showed on the phone. | It needs a look on the phone. | Next phone check |
| K-16 | Plate photos are kept where the photo picker leaves them (the app's cache). iOS can clear that when the phone is short of space, and the photo would then go blank. | Copying them into the app's own storage needs expo-file-system, another native module. It's simplest done with uploads when accounts arrive. | P9 (social), or sooner if it shows |
