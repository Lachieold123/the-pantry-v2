# Home engine: report (12 October 2026)

Branch `feature/home-engine`, worktree `~/Developer/the-pantry-v2-home-engine`, from `cloud/12-feed` with `cloud/02-p5-cupboard` merged in (no conflicts). Not pushed. Design: `docs/HOME-ENGINE.md`.

## Built

- `src/domain/home-engine`: candidates (6 sources), ranking (9 features, 4 logistic heads, configurable weights), re-ranking (cook and cuisine runs, per-page cap, exploration slots, seen suppression), cold start, an explanation per item, sections. Pure TypeScript with 16 tests.
- Local event log (`store/homeEvents.ts`): impressions, opens, dwell, hides and follows are live. Save, cook and like are supported by the engine but have no buttons for published recipes yet.
- Home: "Picked for you" replaces the newest-first rail, with the reason above each card, "Not for me", "Show more", and **Can cook now** and **Missing 1-2** (missing items named). Cook profiles get a Follow button (kept on the phone). Dev and preview builds can rank as any AI cook (`/dev/home-viewer`).
- Ingredient model (owner report, msg 876): parents and varieties, AU/UK/US aliases, substitutes with partial credit, staples with an oil switch, garnish and "to serve" lines don't block, generator junk links fixed. It works in both directions and the Cupboard uses it too.
- Scripts: `scripts/home-engine-sim.mts` and `scripts/pantry-match-report.mts` (both read Supabase with SELECT only, then cache the data locally).
- Migrations (not applied): `20261012000000_home_events.sql` and `20261012000100_home_ranking.sql`, syntax-checked with libpg-query.

## Simulation

Full table: `docs/reports/home-engine-sim.md` (60 viewers, 7 days, 592 recipes).

## Pantry match before and after

Full table: `docs/reports/pantry-match.md` (realistic 72-item pantry).
| Metric (top 20, mean per viewer) | Newest first | Engine day 1 | Engine day 7 |
|---|---|---|---|
| Share from followed cooks (viewers who follow someone) | 11.0% | 72.0% | 51.2% |
| Average pantry match | 22.1% | 48.0% | 35.4% |
| Share in the viewer’s hidden favourite cuisines | 7.7% | 50.3% | 29.5% |
| Distinct cooks in the top 20 | 19.5 | 10.7 | 11.7 |
| Distinct cuisines in the top 20 | 16.7 | 7.9 | 8.8 |
| Longest run from one cook | 1.0 | 1.9 | 1.9 |
| Diet violations (must be 0) | 0.0 | 0.0 | 0.0 |


| Recipes | Shelf | Before: can cook now | Before: missing 1-2 | After: can cook now | After: missing 1-2 |
|---|---|---|---|---|---|
| Catalogue, store build (reviewed) | shelf assumed (default) | 13 | 125 | 18 | 135 |
| Catalogue, store build (reviewed) | only what I ticked | 3 | 40 | 5 | 43 |
| Catalogue, dev build (drafts too) | shelf assumed (default) | 31 | 199 | 39 | 212 |
| Catalogue, dev build (drafts too) | only what I ticked | 10 | 74 | 13 | 82 |
| Published by the AI cooks (592) | shelf assumed (default) | 77 | 353 | 89 | 372 |
| Published by the AI cooks (592) | only what I ticked | 29 | 228 | 28 | 239 |

