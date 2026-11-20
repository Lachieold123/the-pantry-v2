# L1 Baseline: every check, run fresh at `8bbbacd` on 20 Nov 2026

Run by Lane 1 with `tools/L1/baseline.sh` (logs in `evidence/L1/*.log`, exit codes and seconds in `evidence/L1/exitcodes.txt`). Node v24.21.0 on the Mac (CI pins 22; `engines` says `>=22`). Mac time zone is the owner's own; extra zones in section 3. Other lanes were reading the worktree at the same time; I saw no flaky result (Jest ran twice, both green; the one failing e2e test failed again alone).

## 1. Summary against the integration helper's numbers (`INTEGRATION.md` "Final checks")

| Check | INTEGRATION says | I got | Same? |
|---|---|---|---|
| `npm run typecheck` | pass, 0 errors | exit 0, 6 s | yes |
| `npm run lint` | pass, 0 problems | **exit 2: ESLint crashes** (`RangeError: Invalid string length`) because it walked `e2e-report/` (Playwright's HTML report, left by an earlier `test:web`). With `e2e-report`, `test-results`, `dist` ignored: 0 problems in the app; only other lanes' scratch scripts under `docs/audits/.../tools/` fail (L7 `any`, my own warnings) | **no**, see REPO-1 |
| `npm test` domain | 538/538 | 538/538 (156 suites), 54 s, `TZ=Australia/Sydney` | yes |
| `npm test` Jest | 47 suites, 225/225 incl. one `it.failing` | 47 suites, 225/225, run twice (12 s, 7 s), no flake | yes |
| `npm run format:check` | pass | pass, exit 0 | yes |
| `catalogue:check-house` | no problems; photos 349 of 5,210 | exit 0, "No problems", photos 349 of 5210 | yes |
| `catalogue:check-text` | 5,496 recipes, 0 problems | 5496 recipes, 0 problems | yes |
| `catalogue:check-ingredients` | 53,932 lines, 53,931 matched | pass (all assertions pass) | yes |
| `catalogue:validate -- --no-nutrition` | exit 1, 5,209/5,210, 4,528 warnings | exit 1, `PASS 5209/5210; 1 failures, 4528 warnings`; failure `taro-and-pisupo-bake [nutrition]` stated 311 kcal, ingredients about 635 | yes |
| `catalogue:validate` (full, no flag) | not run | exit 1, same single failure | new |
| `npm run feed:verify` | not run | **exit 1**: "Payload problems (1): update fcc4ff98-… (Pasta e Lenticchie): tagged vegetarian/vegan/no-dairy but has parmesan" | new, see REPO-2 |
| `npm run export:web` (CI way) | pass, one 16 MB bundle | exit 0, 12 s, one web bundle 15,842,669 bytes (16 MB), `dist/` 76 MB, 649 files | yes |
| `npm run test:web` | 54 passed, 2 failed | 54 passed, 2 failed (15.5 s) | yes |
| `npx expo install --check` | fails, 4 packages | exit 1, same 4 | yes |
| `npx expo-doctor` | not run | 20/21 pass; the failing check is the same 4 packages | new |
| `npm audit` | not run | 13 vulnerabilities: 1 critical, 4 high, 8 moderate; see section 5 | new |
| DB tests (PGlite) | 23/23 | 23/23 (`rules.test.mjs` + `sync.test.mjs`) | yes |

## 2. Static checks

| Command | Result | Seconds |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`, TypeScript 6.0.3, strict) | 0 errors | 6 |
| `npm run lint` (`eslint .`, v9.39.5) | crashes at report time after an e2e run (see above). Excluding generated folders: 0 errors, 0 warnings in `src/`, `e2e/`, `scripts/` | 14 |
| `npm run format:check` | "All matched files use the correct code style" | 2 |
| Files over 300 lines in `src` | 1: `src/data/catalogue/draftImages.ts` 367 (generated; `eslint.config.js` exempts the generated photo maps). Test files: `store/account.test.tsx` 301 | n/a |
| `max-lines` rule scope | `**/*.{ts,tsx}` only: the 27 `scripts/*.mts` files are outside it (6 are over 300: `validate-house-recipes` 615, `batch-03` 499, `nutrition-estimate` 372, `owner-upload-feed` 369, `convert-old-recipes` 231 ok, `apply-nutrition-13` 226 ok) | n/a |

## 3. Tests

| Suite | Result |
|---|---|
| `npm run test:domain` (node:test via tsx; `src/domain`, `src/lib/*.test.ts`, `src/ui/tokens`, `scripts/*.test.mts`) | 538 pass, 0 fail, 0 skipped, 0 todo, 156 suites, 54 s |
| same, `TZ=UTC` / `Australia/Brisbane` (no DST) / `America/New_York` | 538/538 each, exit 0 (CI pins `Australia/Sydney` only) |
| `npx jest` (jest-expo), run 1 and run 2 | 47 suites, 225 tests, 0 snapshots; both green (12.1 s, 7.2 s). The flaky Jest test the 21 Oct note mentions did not show up in 2 runs, plus 3 runs under UTC, Brisbane and New York (all 225/225). Not proven gone |
| `npx jest` under `TZ=UTC`, `Australia/Brisbane`, `America/New_York` | 225/225 each |
| `npm run test:web` (Playwright 1.56.0, Chromium, iPhone 15 Pro, light and dark projects) | **54 passed, 2 failed** (one test x 2 projects) |
| `node --test supabase/tests/*.test.mjs` (PGlite 0.3.7 installed in `/tmp/pg`) | 23 pass, 0 fail |
| Maestro (26 flows) | not run: needs Xcode simulator and Expo Go; all `id:` selectors checked against source with `tools/L1/maestro-check.mjs`: every id exists. Text selectors cannot all be checked statically (about 60 dynamic accessibility labels) |

### The one failing test, confirmed alone

`e2e/web/library.spec.ts:18` "the library switches tabs in place, and a link opens the tab it names" fails at line 30 (`getByTestId('recipe-card-carbonara')` after tapping the Recent tab). Re-run alone with `npx playwright test -c e2e/web/playwright.config.ts library.spec.ts:18 --project=light`: **fails every time** (3 of 3 runs), so a real defect, not load. Playwright's error is a strict-mode violation: the locator resolves to **two** `<button data-testid="recipe-card-carbonara">` elements with the same aria-label ("Carbonara, Italian, 20m · Serves 2"). The accessibility snapshot in `test-results/.../error-context.md` shows only one card in the tree, so the second copy is hidden or off-tree. Facts gathered: `RecentTab` renders one `RecipeGrid` with one `RecipeCard` (testID `recipe-card-${id}`, `ui/patterns/RecipeCard.tsx:39`); `LibraryScreen` mounts one body at a time (`BODY[tab]`); `recipes.json` has `carbonara` once; `RecentTab`, `RecipeGrid`, `RecipeCard`, `LibraryScreen` have no commits from the merges. So either the same card is rendered twice by the list under `useRecipesFor()(recent)` (`features/saved/libraryHooks.ts:10`) or a second mounted copy of the screen exists in the web build. Not traced further (Lane 2 owns the follow-up; bisect on the `cloud/03-p6-library` merge `475f286` is the next step). It could be a user-visible duplicate card; real iPhone behaviour is unknown.

### Coverage by feature (Jest files per feature folder; generated, see INVENTORY section 9)

| Feature | Jest test files | Playwright (web) | Maestro | Verdict |
|---|---|---|---|---|
| account | 1 (+ `store/account.test.tsx`) | `account.spec` (3, mostly "signed out on the web") | 26 | sign-in, Apple, email code, delete: nothing exercises a real sign-in |
| app (root, ready, not-found, error screen) | 0 | indirect | 01, 02, 03 | `RootErrorScreen`, `NotFoundScreen`, `useAppReady` have no test |
| cook | 3 | `cook-and-cupboard` | 13 | covered |
| cupboard | 2 | `cook-and-cupboard`, `home` | 08, 17, 20 | covered |
| dev | 0 | none | none | `__DEV__` only |
| editor | 1 | `library` (write, import) | 11 | covered thinly |
| feed (Home, community) | 3 | `home`, `first-run` | 04 | Home engine UI covered thinly |
| household | 0 | `pro-and-household`, `audit-fixes` | 25 | no Jest; e2e is offline-only paths |
| plan | 0 | `plan-and-list` | 07 | no Jest |
| plates (share a dish) | 1 | none | 18, 19 | |
| pro | 1 | `pro-and-household` | 24 | purchase flow cannot run off a device |
| recipe | 6 | `audit-fixes`, `library` | 06, 23 | covered |
| recipes (Browse, filters) | 1 | `library` (search) | 05 | |
| saved (library) | 2 | `library` (6) | 09, 10, 12 | one failing test |
| settings | 4 | none | 15 | |
| shell | 1 | indirect | 03 | |
| shopping | 0 | `plan-and-list` | 21, 23 | no Jest |
| surprise | 0 | `cook-and-cupboard` (1) | 14 | |
| tour | 1 | `first-run` | 22 | |
| welcome | 1 | `first-run` (4) | 01, 02 | |
| store (31 files) | 6 | indirect | | sync engine `store/sync.ts` has `sync.test.tsx`; `homeEvents`, `plates`, `tour`, `scans`, `cookLog`, `myRecipes`, `plan`, `saved`, `preferences` stores have no direct test (`saved`/`plan` covered via `recipeBook`, `savedState`) |

Domain modules with no neighbouring test (of 80): `home-engine/` 11 of 12 (`engine.test.ts` is the only test; `events`, `rank`, `features`, `fromPublished`, `candidates`, `config`, `context`, `explain`, `rerank` untested), `ingredients/` (`database`, `format`, `nouns`, `quantity`, `units`), `recipes/` (`browse` tested; `diets`, `labels`, `search`, `searchWords`, `stored`, `substitutions`, `types`, `validate` not), `shopping/` (`amounts`, `extras`), `suggestions/score.ts` (279 lines), `sync/` (`limits`, `personal`), `cupboard/kitchen`, `testing/*`. Some of these are exercised through neighbouring tests (for example `quantity` through `shopping/derive.test.ts`), but no test names them.

Assertion check (`tools/L1/weak-tests.mjs`): 802 `it`/`test` blocks scanned, 4 contain no `expect`/`assert` token, all in `supabase/tests` where an `assertRefused(...)` style helper does the assertion (LEAD only, not a finding). Skipped, todo or failing-by-design tests: exactly one, `LegalRows.test.tsx` REL-09 (`it.failing`), which documents that the guard "Pro cannot go on sale without legal links" is currently violated by design (links not hosted).

Maestro vs app: 26 flows target `host.exp.Exponent` (Expo Go). The app uses native modules Expo Go cannot load (RevenueCat, Apple Authentication), and the dependency list includes `expo-dev-client`. The flows exist for the web-equivalent paths; the `_wait_for_app` subflow clicks Expo Go's "Gear Shape, Filled" and "Tools button", which depends on Expo Go's own UI.

## 4. Catalogue checks

| Command | Result |
|---|---|
| `catalogue:check-house` | exit 0. 5,210 house recipes; difficulty easy 3275, medium 1640, hard 295; provenance `ai-draft` 4649, `ai-assisted` 561; photos 349 of 5210 |
| `catalogue:check-text` | exit 0. 5,496 recipes, 0 problems |
| `catalogue:check-ingredients` | exit 0. All assertions pass |
| `catalogue:validate -- --no-nutrition` | exit 1. 5,209/5,210 pass, 4,528 warnings (style 2811, doneness 777, time 417, link 229, alternative 26, near-duplicate 24, nutrition 10, servings 4, steps 4, duplicate 2, amounts 2). Failure: `taro-and-pisupo-bake` [nutrition] |
| `catalogue:validate` (full) | exit 1, identical result |
| `feed:verify` | exit 1, one payload problem (REPO-2) |

(Lane 7 owns the content findings; the 4,528 warnings are theirs.)

## 5. Packages

`npm audit --json` (`evidence/L1/audit.log`, summary `evidence/L1/audit-summary.txt`): **13 total, 1 critical, 4 high, 8 moderate, 0 low**. "In the app bundle" means the package ships in the web build or the phone binary; "tooling" means it only runs on a developer machine.

| Severity | Package | Via | In the app? |
|---|---|---|---|
| critical | `shell-quote` (command injection, GHSA-pqg4-j6r4-53mv) | `react-native` -> `react-devtools-core` | tooling only: devtools helper, never in the app bundle |
| high | `decode-uri-component` (DoS on malformed percent-encoding, GHSA-vcc3-ghjq-m6fr) | `expo-router` -> `query-string@7.1.3` | **in the web bundle** (the `%[a-f0-9]{2}` matcher is in the export). A crafted link could burn CPU parsing a query string. Low impact (client-side hang) but reachable through deep links |
| high | `query-string`, `expo-router` | same chain | same; npm's fix is `expo-router@58` (a major jump, not available on SDK 57) |
| high | `zod` (memory use on oversized collections) | dev tooling | tooling only |
| moderate | `minimatch`, `@expo/fingerprint`, `expo` (listed because of the two above) | Expo CLI | tooling only (build-time globbing) |
| moderate | 5 `@typescript-eslint/*` packages, via `minimatch` | lint | tooling only |

npm's suggested fix for `expo` is `expo@52.0.49`, a downgrade: do not use `npm audit fix --force`. Real exposure is the one `query-string` chain; the fix is an Expo SDK or expo-router update, or an `overrides` entry for `decode-uri-component@^0.4`.

`npx expo-doctor` (v1.21.8, fetched at run time, not a project dependency): 20/21 checks pass. Failing: packages out of step with the SDK: `expo-dev-client` 57.0.19 (wants ~57.0.21), `expo-image-picker` 57.0.20 (~57.0.21), `expo-splash-screen` 57.0.9 (~57.0.11), `jest-expo` 57.0.5 (~57.0.6). Same four from `npx expo install --check`, which `ci.yml` runs, so **CI goes red on the first push**. Patch-level only, but three are native modules: a new development build is needed after bumping.

## 6. Web export (CI recipe)

CI recipe, from `.github/workflows/ci.yml` job `journeys`: `npx expo export --platform web --clear` with `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`, then `npm run test:web`; Playwright serves `dist/` through `node e2e/web/serve.mjs` on `E2E_PORT` (default 8790) and reuses a running server. I ran exactly that. A plain `npm run export:web` (no env var) gives 52 passed / 4 failed per the integration notes (the two free-limit preview tests need `INTERNAL_BUILD`); CLAUDE.md line 63 says only "export:web first" (see REPO-6).

`dist/` is left in place (76 MB, 649 files) for wave 2 lanes.

| Measure | Value |
|---|---|
| Export time | 12 s |
| Web JS bundle | 1 file, `_expo/static/js/web/entry-d168349371895e4a97abcef74812b1d1.js`, 15,842,669 bytes (about 15.1 MiB; the 18.7 MB `recipes.json` is bundled inside) |
| Other files | `index.html` 1.2 KB, `favicon.ico` 15 KB, `metadata.json` 49 B |
| `dist/assets` | 61 MB, 625 `.webp` photos, 19 `.png`/`.jpg`, 1 `.ttf` icon font |
| Source `assets/` | 60 MB (`brand/`, `recipes/`) |

Largest 20 files in `dist/`:

| Bytes | File |
|---|---|
| 15,842,669 | `_expo/static/js/web/entry-d168...js` |
| 403,810 | `assets/assets/recipes/manakish.e8cadc20....webp` |
| 389,724 | `assets/node_modules/@expo/vector-icons/.../Ionicons.b4eb097d....ttf` |
| 349,602 | `.../recipes/turkish-pide.webp` |
| 314,508 | `.../recipes/kaiserschmarrn.webp` |
| 302,902 | `.../recipes/banh-canh-cua.webp` |
| 299,996 | `.../recipes/lahori-biryani.webp` |
| 291,700 | `.../recipes/beef-brisket.webp` |
| 291,638 | `.../recipes/beef-and-broccoli.webp` |
| 278,592 | `.../recipes/koshari.webp` |
| 271,176 | `.../recipes/lamb-kofta.webp` |
| 270,796 | `.../recipes/baked-kibbeh.webp` |
| 267,084 | `.../recipes/pot-roast.webp` |
| 256,910 | `.../recipes/za-atar-bread.webp` |
| 251,994 | `.../recipes/kimchi-jjim.webp` |
| 233,058 | `.../recipes/tabbouleh.webp` |
| 232,222 | `.../recipes/tlayudas-de-chapulines.webp` |
| 231,074 | `.../recipes/paella.webp` |
| 229,372 | `.../recipes/carne-asada.webp` |
| 229,366 | `.../recipes/fish-pie.webp` |

## 7. CI (`.github/workflows/ci.yml`) against what CLAUDE.md says

- Three jobs: `check`, `journeys`, `database`. Top-level `permissions: contents: read` (read-only token, REL-12 met). No secrets used. No deploy, no write steps.
- `check` runs: `npm ci`, generate typed routes (starts `expo start --offline` and waits for `.expo/types/router.d.ts`), typecheck, lint, format:check, `test:domain` (`TZ=Australia/Sydney`), `test:ui`, `catalogue:check-ingredients`, `npx expo install --check`.
- Not in CI: `catalogue:check-house`, `check-text`, `validate`, `feed:verify`, `supabase/tests/sync.test.mjs` (only `rules.test.mjs`), `npm audit`, Jest in a second time zone.
- Actions pinned by tag (`actions/checkout@v4`, `actions/setup-node@v4`), not by commit SHA.
- `database` installs `@electric-sql/pglite@0.3.7` with an unpinned `npm init -y` in `/tmp/pg`.
- As of this HEAD, CI would be red on `expo install --check` and on `library.spec.ts:18`.
- CLAUDE.md says "Push to GitHub at the end of every working session"; the branch `main` is 212 commits ahead of `origin/main` and `audit/deep-1120` is on no remote (REPO-3).

## 8. Not run, and why

- Maestro (no simulator run was allowed or set up), anything on a device, RevenueCat paywall wording, notifications, Apple sign-in.
- `npm audit fix`, `expo install --fix` (read-only rule).
- Lint of the whole tree including other lanes' tool folders cleanly (they are scratch, and they trip rules; see REPO-1).
