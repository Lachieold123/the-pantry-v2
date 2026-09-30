# Known issues

Things deliberately deferred. Each has a phase in which it gets fixed. Nothing here blocks the current phase unless marked **blocking**.

Phases are P1–P11 from `docs/V1-PARITY-PLAN.md`. The map's old "Phase 1–10" numbers (`REBUILD-MAP.md` §10) no longer apply.

| # | Issue | Why it's deferred | Fix in |
|---|---|---|---|
| K-1 | Claude's cloud workspace can't download packages; the Mac mini's workspace can, so builds happen there (D-020). `expo-doctor` can't reach Expo's servers from either, so two of its 21 checks can't run. | Network settings. Run `npx expo-doctor` on the Mac itself once to confirm. | Next session on the Mac (P1 has closed) |
| K-3 | 281 ingredient lines name two options ("beef or lamb mince"). The shopping list uses one option; diet tags need every option to fit and the avoid list hides the dish if any option matches (F189). | Cautious; rewriting lines is part of vetting. `docs/reports/catalogue-report.md` lists them. | Recipe vetting |
| K-4 | Recipe times and missing ingredients flagged in `scripts/data/recipe-tags-notes.md` (e.g. gnocchi's cook time, butter used but not listed) aren't fixed yet. | They need a cook's judgement; fix via `recipe-fixes.json` while cook-testing. | Recipe vetting |
| K-5 | Nutrition isn't built. D-028 decided how: values per 100 g and typical weights for each ingredient in the database (AFCD), calculated on the phone, with AI only for lines it can't match. | P3 closed without it. | P3 follow-up (next up); AI gap-fill in P10 |
| K-6 | Cuisine calls marked "unsure" in `recipe-tags-notes.md` (Tex-Mex, Italian-American, Hawaiian) need Lachlan's view. | Editorial choice. | Recipe review |
| K-7 | On the web preview the old tab labels' descenders ("Today", "Shop") were slightly clipped. P2 replaced those tabs with v1's (Feed, Browse, Cupboard, Plan). | Web-only layout; recheck the new labels on the web preview and the phone, then close this. | P2 phone check |
| K-8 | Sentry isn't set up: it needs a Sentry account and project (the map wants a DSN from the first build). | Needs Lachlan to create the project. | P11, before the first TestFlight |
| K-10 | Component and journey test coverage is still thin next to the domain maths. On 30 Sep: 344 domain tests; 55 component tests in 16 files, of which only four render a whole screen (Browse, Filters, the recipe page and Cook Mode; F222); 16 Maestro flows, which target Expo Go rather than the development build and don't run in CI (F219). | Maestro needs Xcode's simulator on the Mac. | Rule 10 in every phase; the full suite in P11 |
| K-11 | On the web preview, multi-line fields (ingredients, method) scroll inside a fixed box instead of growing. | Web-only; on phones they grow with the text. | P11, if it shows on a phone |
| K-12 | The old-app import is tested with sample data only. It needs one run on a phone that has the old TestFlight build installed (D-024). | Needs Lachlan's phone. | P11, before the first TestFlight |
| K-13 | An imported recipe keeps the link it came from, but the recipe page doesn't show it yet (only the editor does). | Small; wants a design for credits on your own recipes. | P6 (my recipes) |
