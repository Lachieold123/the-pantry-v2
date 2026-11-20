# L1 Repo health findings (Lane 1), HEAD `8bbbacd`, 20 Nov 2026

## Summary

Counts: **S1 0, S2 3, S3 10, S4 4** (17 findings, REPO-1 to REPO-17). Confidence: 12 CONFIRMED, 2 LIKELY, 3 LEAD. Nothing was fixed (read-only audit).

The five worst, in plain words:

1. **REPO-1** The 272 commits of work are on this machine only. `main` is 212 commits ahead of GitHub and this audit branch is on no remote. One dead disk and it is gone, and CLAUDE.md says to push every session.
2. **REPO-2** The community feed upload contains "Pasta e Lenticchie", tagged vegan, vegetarian and no-dairy, with parmesan in the ingredients. Someone avoiding dairy would be shown it as safe. `npm run feed:verify` catches this and fails today, but CI never runs it. Lane 7 owns the fix.
3. **REPO-3** One Library test fails every time (Recent tab shows two "Carbonara" cards to the test). It may be a real duplicate card on screen, and it turns CI red.
4. **REPO-4** CI would be red on the first push anyway: `expo install --check` fails on 4 packages, and the library test above fails. Nobody would be able to tell a real break from a known one.
5. **REPO-5** `npm run lint` crashes (exit 2) once a web test run has left its report folder behind, so the lint gate can stop working with no code change.

Coverage: 100% of the lane's brief ran (all baseline commands, rules as code, CI, repo, Mac). Not run: Maestro, anything on a device, `npm audit fix`, the other worktrees' dirty state (read-only rule, section "Not tested"). Inventory: 44 routes, 15 persisted stores, 80 domain modules, all listed in `L1-INVENTORY.md`.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|---|---|---|---|---|---|
| REPO-1 | S2 | owner | CONFIRMED | Work exists only on this Mac (212 commits on `main`, audit branch on no remote) | git: `main`, `audit/deep-1120` |
| REPO-2 | S2 | owner | CONFIRMED | Feed payload tags a parmesan recipe vegan, vegetarian, no-dairy; the check that catches it is not in CI | `docs/backups/feed-payloads-2026-10-17/feed-updates.json` id `fcc4ff98-…`; `scripts/verify-feed-payload.mts`; `ci.yml` |
| REPO-3 | S2 | auto | CONFIRMED | `library.spec.ts:18` fails every run: two `recipe-card-carbonara` on Recent tab | `e2e/web/library.spec.ts:30`; `src/ui/patterns/RecipeCard.tsx:39` |
| REPO-4 | S3 | auto | CONFIRMED | `expo install --check` fails on 4 packages, so CI step is red (and K-28 regressed) | `.github/workflows/ci.yml`; `package.json` |
| REPO-5 | S3 | auto | CONFIRMED | `npm run lint` crashes after a `test:web` run (walks `e2e-report/`, `test-results/`, tool scratch) | `eslint.config.js` ignores |
| REPO-6 | S3 | auto | CONFIRMED | CI skips the catalogue gates, `feed:verify` and `sync.test.mjs` (K-32, K-36 tests never run) | `.github/workflows/ci.yml` |
| REPO-7 | S3 | auto | CONFIRMED | `npm audit`: 1 critical, 4 high; shell-quote critical is back (8 Oct SEC-24 regressed); query-string chain is in the web bundle | `package.json` / lockfile |
| REPO-8 | S3 | owner | CONFIRMED | `catalogue:validate` fails on `taro-and-pisupo-bake` (stated 311 kcal, ingredients about 635) | `src/data/catalogue/recipes.json` / `scripts/data/house-recipes/` |
| REPO-9 | S3 | auto | CONFIRMED | Case clash: `APP-STORE-LISTING.md` and `app-store-listing.md` both tracked; 3 parked WIP branches and a stash hold the other copies | `docs/launch/` |
| REPO-10 | S3 | auto | CONFIRMED | Docs say wrong things: CLAUDE.md export step, README, HQ launcher pulls stale `origin/main` on the wrong branch and uses Expo Go | `CLAUDE.md:63`, `README.md`, HQ `Open The Pantry v2.command` |
| REPO-11 | S3 | auto | LIKELY | Startup waits for 11 stores, not `plates`, `tour`, `scans`, `homeEvents` | `src/features/app/useAppReady.ts` |
| REPO-12 | S3 | auto | CONFIRMED | `home-engine` has one test file for 12 modules (ranking has no direct tests) | `src/domain/home-engine/` |
| REPO-13 | S3 | auto | LIKELY | `/dev/home-viewer` and the "Pro testing" switches ship in preview/TestFlight builds | `src/app/dev/home-viewer.tsx`, `eas.json` (K-29) |
| REPO-14 | S4 | auto | CONFIRMED | `.mts` scripts sit outside the lint and 300-line rules; 4 are over 300 | `scripts/*.mts`, `eslint.config.js` |
| REPO-15 | S4 | auto | CONFIRMED | Maestro flows target Expo Go, which cannot run the app's native modules; not runnable in CI | `.maestro/*`, `scripts/run-maestro.command` |
| REPO-16 | S4 | auto | CONFIRMED | 19 extra worktrees and 15+ unpushed or merged branches to tidy; 3 unused exports | `git worktree list` |
| REPO-17 | S4 | auto | LEAD | Stale Mac leftovers: `expo-preview.pid`, `pantry-overnight`, CI actions pinned by tag, unpinned pglite install | `~/Developer/`, `ci.yml` |

## Findings

### REPO-1 (S2, owner, CONFIRMED) Work exists only on this Mac
- Where: `git rev-list`: local `main` is ahead 212 of `origin/main`; `audit/deep-1120` is 272 ahead; `git branch -r --contains HEAD` is empty. Branches with no upstream: `feature/home-engine`, `house-recipes-batch-03`, `-04`, `-04-merge`, `-sA/sB/sC`, `overnight/pantry-code-items`, `cloud/08-paywall-terms`, 12 `worktree-agent-*`. The Mac has 2.3 GB across worktrees.
- Harm: disk loss, a bad `git clean` or a worktree removal loses every house recipe batch, the sync work and this audit. The three unmerged WIP branches would go too.
- Root cause: nothing pushes at the end of a session, though CLAUDE.md says "Push to GitHub at the end of every working session".
- Smallest fix: `git push origin main` after review and push the branches worth keeping. Fix is the owner's call because it publishes 212 commits (includes `docs/backups` data and a 18.7 MB `recipes.json`).
- Test that would catch it: a one-line session-end check that `git status -sb` shows no "ahead".

### REPO-2 (S2, owner, CONFIRMED) Parmesan recipe tagged vegan
- Where: `feed-updates.json`, row `fcc4ff98-…` "Pasta e Lenticchie": `diets` = `["vegetarian","vegan","no-dairy"]`; ingredient "Parmesan, grated, to serve (optional)" and step "serve with … grated parmesan if you like". `npm run feed:verify` exits 1 with exactly this row ("Payload problems (1)").
- Harm: a Diet filter on the community feed treats it as safe for vegans or dairy-free people (food-safety class, but the parmesan is optional garnish). If this payload was applied to `published_recipes`, it is live now. I did not read the live table (read-only on services).
- Root cause: the 17 Oct upload tagged by dish name. The check exists (`docs/FEED-VERIFY.md`) but is not in CI and not in the integration "Final checks".
- Smallest fix: remove the parmesan line and step text or drop the vegan and no-dairy tags in the payload and the live row; add `feed:verify` to CI. Lane 7 decides the content.
- Test: `feed:verify` in CI.

### REPO-3 (S2, auto, CONFIRMED) Library test fails every time
- Where: `e2e/web/library.spec.ts:30` after tapping the Recent tab; `RecipeCard.tsx:39` (`testID recipe-card-${id}`). Failed 3 of 3 alone on the light project, and once on dark in the full run: "strict mode violation: 2 elements".
- Harm: CI red. If the second element is a visible duplicate on iPhone, the Recent tab shows a dish twice. The accessibility snapshot shows one, so a hidden or stale copy is likelier. Unknown on device.
- Root cause: not found. `RecentTab`, `RecipeGrid`, `RecipeCard` and `LibraryScreen` render one copy by reading; `carbonara` appears once in `recipes.json`. Next step: bisect against the `cloud/03-p6-library` merge (`475f286`) and dump the DOM around the two buttons (`test-results/library-…-light/` has the trace).
- Smallest fix: find the second mount, or scope the test with `.first()` only if the duplicate is a hidden transition copy (do not do it blind).
- Test: this one, already written.

### REPO-4 (S3, auto, CONFIRMED) `expo install --check` fails
- Where: `expo-dev-client` 57.0.19 (want ~57.0.21), `expo-image-picker` 57.0.20 (~57.0.21), `expo-splash-screen` 57.0.9 (~57.0.11), `jest-expo` 57.0.5 (~57.0.6). CI step `check` runs it.
- Harm: CI never goes green; people learn to ignore red. Three are native, so the fix needs a new development build (K-28 said "mostly done", now regressed).
- Fix: `npx expo install --fix`, rebuild the dev client, run all checks. Owner approves the native rebuild.

### REPO-5 (S3, auto, CONFIRMED) Lint crashes after an e2e run
- Where: `eslint.config.js` ignores do not list `e2e-report/`, `test-results/` or `docs/audits/**/tools`. `npm run lint` exits 2 (`RangeError: Invalid string length` in the stylish formatter). The integration helper's lint passed because the report folder did not yet exist.
- Harm: a local "lint passes" depends on whether `test:web` ran first. In CI the order is fine, so this bites on the Mac. Scratch scripts in `docs/audits/.../tools` also fail the rules (7 errors, 3 warnings, none in the app).
- Fix: add those three paths to `ignores`. One line each. Test: run `test:web` then `lint` in CI order reversed.

### REPO-6 (S3, auto, CONFIRMED) CI misses gates that exist
- Where: `ci.yml`. Not run: `catalogue:check-house`, `check-text`, `validate`, `feed:verify`, `supabase/tests/sync.test.mjs` (CLAUDE.md says `supabase/tests/*.test.mjs`; CI runs `rules.test.mjs` only), `npm audit`.
- Harm: K-32 and K-36 (sync security and paging) can regress unseen; REPO-2 and REPO-8 get through.
- Fix: add the cheap ones (`check-house`, `check-text`, `feed:verify`, the second DB test file) as CI steps. `validate` stays advisory until REPO-8 is settled.

### REPO-7 (S3, auto, CONFIRMED) npm audit
- 13 vulns (1 critical shell-quote via react-native devtools, 4 high, 8 moderate). 8 Oct SEC-24 said the critical was cleared; it is back: **regressed**. Reachable in the app: `query-string` and `decode-uri-component` via `expo-router` are in the web bundle (DoS on a malformed percent-encoded link param). The rest is tooling. Do not use npm's suggested `expo@52` downgrade.
- Fix: bump to the expo-router version the next SDK patch ships, or an `overrides` for `decode-uri-component`; re-audit. Test: `npm audit --omit=dev` in CI.

### REPO-8 (S3, owner, CONFIRMED) `taro-and-pisupo-bake` nutrition
- `catalogue:validate` fails 1 of 5,210: stated 311 kcal against about 635 from the ingredients. The only hard failure; content call for the owner (Lane 7).

### REPO-9 (S3, auto, CONFIRMED) Case clash
- Both `docs/launch/APP-STORE-LISTING.md` and `docs/launch/app-store-listing.md` are tracked. On macOS (case-insensitive) they are one file, and the worktree shows it modified. Three unmerged parked branches (`worktree-agent-a6b1f078d88b29cbc`, `-a7835262a4f8f1885`, `-ac2e37f73ad229589`) and stash `k17-dirty-app-store-listing` each hold a version. Harm: a clone on Linux (CI) gets two files, and a checkout on the Mac can show the wrong text. Fix: pick one file (owner confirms which text is right), `git rm` the other by exact case, drop the stash and branches.

### REPO-10 (S3, auto, CONFIRMED) Docs and launcher that lie
- CLAUDE.md line 63 says run `export:web` first; a plain export gives 52/4 because the Playwright suite needs `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1` (the CI recipe). README says "What's here so far", has a stale folder table, omits `supabase`, `e2e`, `.maestro`.
- The HQ launcher `Open The Pantry v2.command` runs `git pull --ff-only origin main` in `~/Developer/the-pantry-v2`, which is on `house-recipes-batch-01`, and `origin/main` is 212 commits behind, so it either fails or merges old code. It then runs `npx expo start --go` (Expo Go), which cannot load RevenueCat and Apple sign-in.
- Fix: edit the three docs; change the launcher to `npx expo start --dev-client`, no pull.

### REPO-11 (S3, auto, LIKELY) Startup does not wait for four persisted stores
- `useAppReady.ts` waits (4 s cap) for 11 stores but not `plates`, `tour`, `scans`, `homeEvents`. Hand-off to Lane 3: a first frame with tour or scans defaults could flash the tour or reset a free-scan count before hydration. Not reproduced.
- Fix: add them to `STORES`. Test: unit test that every persisted store key is in the list (the inventory table makes this a one-line check).

### REPO-12 (S3, auto, CONFIRMED) Home ranking has no direct tests
- `home-engine/` has 12 modules and one `engine.test.ts`. `rank`, `features`, `candidates`, `rerank`, `explain`, `events`, `fromPublished` have none. Harm: a ranking tweak can hide dishes (a diet filter lives next to them). Also no neighbour tests for `recipes/diets`, `recipes/search`, `shopping/amounts`, `sync/limits`. Fix: add tests with fixtures first for `diets` and `candidates` (the filters), then `rank`.

### REPO-13 (S3, auto, LIKELY) Internal tools ship in preview builds
- `/dev/home-viewer` and the "Pro testing" switches show when `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`, which `eas.json` sets for `preview`. Production unsets it but nothing blocks setting it from the EAS dashboard (K-29, **still open**). Fix: a CI or build check that fails a production profile when the variable is 1.

### REPO-14 (S4) `.mts` scripts unlinted
- `eslint.config.js` globs `**/*.{ts,tsx}` only. 27 scripts are outside max-lines, no-any and the rest; `validate-house-recipes` 615, `batch-03` 499, `nutrition-estimate` 372, `owner-upload-feed` 369 lines. Low harm; they are tooling. Fix: add `**/*.mts` to the globs when convenient.

### REPO-15 (S4) Maestro cannot be checked here
- 26 flows target `host.exp.Exponent`; every `id:` exists in source (`maestro-check.mjs`), but about 60 text assertions are dynamic and unverified; the `_wait_for_app` subflow taps Expo Go's own UI. Not in CI. LEAD: some flows may be stale.

### REPO-16 (S4) Worktrees, branches, dead code
- 20 worktrees (repo root on `house-recipes-batch-01`, `-b04-merge`, `-b04-sA/B/C`, `-batch03`, `-batch04`, `-home-engine`, `-main` (eadebb2), `-overnight`, `-polish`, `-preview`, 5 `.claude/worktrees/agent-*`, this audit). Every checked-out branch is merged into HEAD, so each can be removed once its owner confirms it has no uncommitted work (I could not look; dirty state unknown). Size seen: the repo 2.3 GB, `-main` 873 MB. Unused exports: `plainKitchen`, `purchasesConfigured`, `refreshToday`. `LegalRows.test.tsx` REL-09 `it.failing` is by design.

### REPO-17 (S4, LEAD) Mac leftovers and CI hygiene
- `~/Developer/expo-preview.pid` points at a dead process; `expo-preview.log` is from 9 Oct; `~/Developer/pantry-overnight` is a one-off `claude -p` runner, last run 21 Oct, not scheduled (no launchd or cron jobs). CI uses `actions/*@v4` tags, not SHAs, and installs pglite with an unpinned `npm init -y`. No secrets found in HEAD or history by prefix search (`sb_secret_`, `eyJhbGci`); the RevenueCat public key is a literal by design.

## Carry-over from the 8 October audit and KNOWN-ISSUES (Lane 1 items)

| Item | Status now |
|---|---|
| SEC-24 build-time advisories (shell-quote critical cleared) | **regressed** (REPO-7) |
| REL-12 CI misses journeys, routes, database | still fixed for those; `sync.test.mjs`, catalogue checks, `feed:verify` still missing (REPO-6) |
| K-28 deps up to date, `expo install --check` added | **regressed** (REPO-4) |
| K-29 draft recipes env in a production build | still open (REPO-13) |
| K-10 test counts (331 domain, 109 component, 46 web, 13 DB) | no longer applies: now 538, 225, 56, 23 |
| K-8 no Sentry | still open (no Sentry in `package.json`, `app.json` or `src`) |
| K-12 old-app import only tested with samples | still open (device only) |
| K-34 Maestro 25-household and 26-account hit production | still open (flows unchanged, not run) |
| K-35 privacy manifest needs a prebuild check | still open (needs a native build) |
| K-36 paging pulls (written) | migration and `sync.test.mjs` present and 23 DB tests pass; CI does not run `sync.test.mjs` (REPO-6) |
| K-1 builds on the Mac mini | still true |
| REL-09 paywall must not go live without legal links | still guarded by the `it.failing` test; `LEGAL_URLS` is `{}` |

## Refuted (appendix)

- "Lint finds problems in the app": false. With generated folders ignored there are 0 problems in `src`, `e2e`, `scripts`.
- "Secrets are committed": not found; mentions are only in docs, `scripts/owner-upload-feed.mts` and `supabase/tests/harness.mjs`.
- "Files over 300 lines in `src`": only a generated file (exempt) and one test at 301 lines.
- "Flaky Jest": 5 runs green (2 plain, 3 time zones); not reproduced.
- "Time-zone bugs in domain or Jest": 538/538 and 225/225 in UTC, Brisbane and New York as well as Sydney.
- "Unused dependencies": none outright.
- "Dead `simulate.ts`": used by `scripts/home-engine-sim.mts`.

## Not tested

Maestro on any simulator or device; Apple sign-in, RevenueCat, notifications and Realtime against the live project; the live `published_recipes` table (REPO-2 may or may not be applied); uncommitted state inside the 19 other worktrees; GitHub-side settings (branch protection, secrets); Node 22 (CI) versus Node 24 (Mac).
