# FIX-TOOLING (20 Nov 2026)

Branch `audit/deep-1120`. Nothing pushed. No `package.json`, lockfile or `node_modules` change.

## REPO-6: CI gates (77b182d) FIXED

`ci.yml` now also runs, in the `check` job: `catalogue:check-house`, `catalogue:check-text`, `catalogue:validate -- --no-nutrition` and `feed:verify`. The `database` job now runs `node --test supabase/tests/*.test.mjs` (all four files, not only `rules.test.mjs`) with `PGLITE` set. `catalogue:convert` is not added: it needs the old app. None of the others needs the network.

Local runs on this branch right now (the content fixers are still editing, so results move):

| Command | Result | Time |
|---|---|---|
| `catalogue:check-ingredients` | pass | under 1 s |
| `catalogue:check-house` | FAIL, 39 lines flagged ("looks like find-and-replace damage", e.g. `dashi-free`, `mayo-free`) | 0.8 s |
| `catalogue:check-text` | FAIL, 98 lines flagged, same kind | 0.3 s |
| `catalogue:validate -- --no-nutrition` | FAIL: 994 of 5,496 fail (food-safety 623, repo 58, allergen 7, diet 7, nutrition 3, style 1) | 2.3 s |
| `feed:verify` | FAIL (expected): Pasta e Lenticchie, vegan with parmesan | 0.2 s |
| DB tests, all four files | pass, 34 of 34 | 1.1 s |

Decision: `validate` is set `continue-on-error: true` with a comment, because the audit said it stays advisory until the catalogue is repaired and it fails 994 recipes today. The others are blocking, so CI will be red until the catalogue and feed fixes land. Remove `continue-on-error` when `validate` reaches zero.

## REPO-17 part: action pins (77b182d) PART-FIXED

`actions/checkout` and `actions/setup-node` are pinned to full SHAs (both v4.4.0), verified with `gh api repos/<owner>/<repo>/git/ref/tags/v4.4.0`: checkout `11d5960a…`, setup-node `49933ea5…`. These are the only two actions. The pglite install was already version-pinned (`@0.3.7`) but sits outside `package.json`; it is left for the dependency step (add it as a devDependency, then drop the temp install from the `database` job).

## REL2-11 / K-29 (e7aee15, 77b182d) FIXED

`eas.json` `build.production.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES` is now `"0"`. New `.github/scripts/check-eas-env.mjs` (follows `extends`) exits 1 unless production resolves the flag to `"0"`; it runs as a CI step in `check`. Check: passes now. Still to confirm on the next real build log that EAS applies the `eas.json` value over the dashboard (the audit notes it should).

## REL2-14 (e7aee15, 77b182d) FIXED

`"node": "22.20.0"` added to `production`, `preview` and `development` (`development-simulator` inherits it). New `.nvmrc` = `22.20.0`; CI jobs now use `node-version-file: .nvmrc`, so CI, EAS and the Mac share one version (before, CI used floating 22). `engines` (`>=22`) is unchanged.

## REPO-15: Maestro (c1b5e81) PART-FIXED, UNRUN

All 26 flows and 5 subflows: `appId` is now `com.lachlanoldfield.thepantry`; `_wait_for_app.yaml` and the README describe the development build, with `METRO_URL=thepantry://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. The Expo Go gear and "Continue" steps stay: they are guarded by `when: visible` so they are skipped if absent. Nothing was run (no simulator here). Left: `scripts/run-maestro.command` still starts Expo Go, checks for `host.exp.Exponent` and passes an `exp://` link (it is under `scripts/`, which another fixer owns). Also left: about 60 dynamic text assertions are still unverified.

## REPO-10: wrong docs (48cd967 + launcher) FIXED

- `CLAUDE.md` Commands: `test:web` line now says to export with `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1 npx expo export --platform web --clear` as CI does; added `feed:verify`, `format:check` and the eas check.
- `README.md`: rewritten (plan links, folder table with `supabase`, `e2e/web`, `.maestro`, `.github`, Node 22 and the development build).
- `docs/HOUSEHOLD.md` and `docs/SEED-KITCHEN-OFF.md`: migration names now match `supabase/migrations/` (`20261120000400_rows_received_at`, `20261120009900_realtime_private_broadcast`, `20261016204729_seed_kitchen_retired`, `20261120000500_seed_kitchen_off`) and point to `supabase/APPLY-LIVE.md`.
- Launcher `~/Desktop/HQ/11-ThePantryV2/Open The Pantry v2.command` (outside the repo, so not in a commit): opens the audit worktree, says at the top it expects `audit/deep-1120`, warns if the branch differs, no pull or branch switch, runs `npx expo start --dev-client`. Not double-clicked here.

## REPO-14: `.mts` lint (not changed)

A one-off ESLint run over `scripts/*.mts` with the app's rules found 10 problems in total: `max-lines` 4 (`batch-03`, `nutrition-estimate`, `owner-upload-feed`, `validate-house-recipes`), `no-unused-vars` 4 (`estimate-nutrition-from-lines`, `fix-nutrition-from-lines`, `validate-house-recipes`), `no-undef` 2 (`owner-upload-feed`, probably a Node global). No `no-explicit-any` hits. To switch it on later: add `**/*.{ts,tsx,mts}` to the glob in `eslint.config.js` (the expo config also needs to cover `.mts`, or the typescript plugin is not found: it failed that way when tried), then split the four long files and fix the six small ones. The temporary config used was deleted.

## REPO-16: worktrees and branches (REPO-TIDY.md) FIXED (report only)

See `REPO-TIDY.md`. 18 worktrees, 38 local branches; all contained in `audit/deep-1120` except three `worktree-agent-*` branches that each hold one parked copy of `APP-STORE-LISTING.md` (tie to REPO-9). Three unused exports listed there. Nothing deleted.

## REPO-17 rest: Mac leftovers LEFT

`expo-preview.pid` (PID 11446, not running) is in `~/Developer/`, outside the repo folders, so not trashed; `pantry-overnight` is a one-off runner. Both described in `REPO-TIDY.md`.

## Left for later

- `run-maestro.command` switch to the development build, then a real simulator run of the flows.
- Move pglite into `package.json` devDependencies (dependency step).
- Drop `continue-on-error` on `catalogue:validate` once it is clean.
- Turn lint on for `.mts` (REPO-14).
- Skipped as told: REPO-1, REPO-4, REPO-7, REL2-17, REPO-9. REL2-16 (over-the-air updates) is an owner call, not touched.
