# L6: performance and release readiness (branch `audit/deep-1120`, HEAD `8bbbacd`)

Lane 6, 20 Nov 2026. Read-only on source and live services. Numbers from Lane 1 (`L1-BASELINE.md`, `L1-INVENTORY.md`) are reused, not re-run. Scripts: `tools/L6/perf.mts`, `assets.mts`, `hermes-gen.mts`. Evidence: `evidence/L6/` (`perf.json`, `assets.json`, `hermes-size.txt`, `live-readonly.txt`, `APP-STORE-LISTING.HEAD.md`).

## Summary

**Counts:** S1 4, S2 5, S3 6, S4 6 (21 findings). Coverage 30 of 34 lane items (88%); see Coverage.

**The five worst, in plain words**

1. **REL2-1 (S1).** Home shows "From other cooks: Picked for you", and those cooks are 99 made-up people with names, home towns, follower counts and a Follow button. None of them says it's AI. App Review can call that misleading (2.3.1, 5.6). The listing also tells Apple there are "no strangers".
2. **REL2-2 (S1).** Pro goes on sale the moment Apple returns products, with no privacy or terms link beside the button, because `LEGAL_URLS` is empty. Guideline 3.1.2 rejects that. The guard test is parked as `it.failing`.
3. **REL2-3 (S1).** Deleting an account doesn't revoke Sign in with Apple. The function isn't deployed. That's guideline 5.1.1(v) (K-19).
4. **REL2-4 (S1).** There's no privacy policy, terms or support page anywhere, and no contact address in the app. App Store Connect needs the support and privacy URLs before submission (K-23).
5. **PERF-1 (S3, the worst cost).** A store build bundles all 5,496 recipes (6.85 MB of Hermes bytecode) and keeps them in memory, but it only shows 271 (0.55 MB). The fix copies the photo trick the code already uses.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|---|---|---|---|---|---|
| REL2-1 | S1 | owner (auto fallback) | CONFIRMED | 99 fictional "person" cooks shown as real people on Home in store builds | `features/feed/FeedScreen.tsx:195`, `HomeForYou.tsx`, `CookScreen.tsx:64-100`; `cooks` table |
| REL2-2 | S1 | auto + owner | LIKELY | Paywall sells Pro with no privacy or terms links | `features/pro/PaywallScreen.tsx:67`, `BuyPanel.tsx:97`, `lib/legal.ts:6` |
| REL2-3 | S1 | live + owner | CONFIRMED | Account deletion doesn't revoke Sign in with Apple (K-19) | `lib/account.ts:207`; edge functions list |
| REL2-4 | S1 | owner | CONFIRMED | No hosted legal or support pages, no contact in the app (K-23) | `lib/legal.ts:6`; listing "URLs" |
| REL2-5 | S2 | auto | CONFIRMED | CI is red: 4 Expo packages behind SDK 57 | `package.json` |
| REL2-6 | S2 | live (owner yes) | CONFIRMED | Live migration history doesn't match the repo; 6 migrations unapplied | `supabase/migrations/`, live `schema_migrations` |
| REL2-7 | S2 | owner | CONFIRMED | Paywall plan and trial wording never checked against the real store; RevenueCat has no trial | `domain/pro/purchase.ts:60-77`; RevenueCat products |
| REL2-8 | S2 | owner | CONFIRMED | "Coming soon" scan buttons in store builds (2.1) | `features/cupboard/WaysIn.tsx:14`, `ScanSheet.tsx:177` |
| REL2-9 | S2 | auto | CONFIRMED | Listing file out of step: case clash, stale counts, wrong age-rating answer | `docs/launch/APP-STORE-LISTING.md` / `app-store-listing.md` |
| REL2-10 | S3 | auto | CONFIRMED | npm audit: shell-quote critical back (dev tooling only), decode-uri-component unfixable | `package-lock.json` |
| REL2-11 | S3 | auto | CONFIRMED | Nothing stops the drafts flag reaching a production build (K-29) | `eas.json` `build.production` |
| REL2-12 | S3 | owner | CONFIRMED | No crash reporting; the root error screen throws the error away (K-8) | `app/_layout.tsx:18`, `features/app/RootErrorScreen.tsx` |
| REL2-13 | S3 | owner | CONFIRMED | Store and TestFlight builds show 271 recipes, not 5,496 | `domain/recipes/provenance.ts:7` |
| PERF-1 | S3 | auto | CONFIRMED | Store build bundles and keeps all 5,496 recipes to show 271 | `data/catalogue/catalogue.ts:13-30` |
| PERF-2 | S3 | auto | CONFIRMED | Cupboard matching runs once per hook instance; slow with the full catalogue | `store/cookable.ts:31`, `store/suggestions.ts:38,97` |
| PERF-3 | S4 | auto | LIKELY | Four fire-and-forget timeouts never cleared | `ActionSheet.tsx:28`, `DrawerScreen.tsx:48`, `SettingsScreen.tsx:126`, `accountActions.ts:84` |
| PERF-4 | S4 | auto | LEAD | Shopping list and cupboard lists render every row (not virtualised) | `features/shopping/ShoppingListView.tsx:124-200` |
| REL2-14 | S4 | auto | CONFIRMED | Node version not pinned for EAS builds | `eas.json` |
| REL2-15 | S4 | live | CONFIRMED | Unused RevenueCat entitlement "The Pantry Pro" (no products) | RevenueCat `entl48c5745bc2` |
| REL2-16 | S4 | owner | CONFIRMED | No over-the-air updates (K-27) | `app.json` (no `updates`, `runtimeVersion`) |
| REL2-17 | S4 | auto | CONFIRMED | `react-native-purchases` left on a caret range, unlike the other native modules | `package.json` |

## Findings

### REL2-1 (S1, owner with an auto fallback, CONFIRMED): made-up cooks shown as real people

**What a person sees.** A store build's Home has a section "From other cooks / Picked for you" (`FeedScreen.tsx:195` renders `<HomeForYou />` with no build check). Each card shows a cook's name and avatar (`PublishedCard.tsx:27-30`). The cook page shows a home region, "N recipes · N followers · N following", a bio and a **Follow** button (`CookScreen.tsx:60-100`).

**Evidence (live, SELECT only, `evidence/L6/live-readonly.txt`).** `cooks` has 100 rows: 1 `official` and 99 `person`. No `person` row's name or bio contains the word "AI". All 99 have follower counts (max 39). `HomeForYou.tsx:22-45` calls them "AI cooks" only in test builds' testing strip. `domain/published/published.ts:74` maps every non-official cook to `'person'`. No published recipe is newer than 30 days (the seed kitchen was retired 17 Oct).

**Why it hurts.** A reviewer, or a user who follows "a cook", believes real people are posting. Fabricated people and follower counts are a 2.3.1 (misleading) and 5.6 (honesty) rejection risk. The listing's age-rating notes (`APP-STORE-LISTING.md` line 163) say "no public posts, no strangers". That's false while this section shows.

**Smallest fix.** This is the owner's call between two options:
- (a) Label them. Add an "AI cook" line on `PublishedCard` and `CookScreen` for `kind === 'person'` seed cooks, and drop the follower counts. That needs a `cooks` column, or the client treats every non-official cook as AI.
- (b) Hide the section in store builds. Wrap `<HomeForYou />` in the same `TESTING` constant `HomeForYou.tsx:23` and `app/dev/home-viewer.tsx` already use.

The fallback the fixer can apply now is (b). It's one line and reversible.

**Test that would have caught it.** A FeedScreen test with `EXPO_PUBLIC_SHOW_DRAFT_RECIPES` unset that expects no `home-for-you`, or one that expects the AI label.

### REL2-2 (S1, auto + owner, LIKELY): Pro on sale without privacy and terms links

**What a person sees.** When StoreKit returns products, `PaywallScreen.tsx:67` shows `BuyPanel`. Its `LegalLinks` (`BuyPanel.tsx:97-99`) filters `legalLinks()`. That comes back empty because `LEGAL_URLS = {}` (`lib/legal.ts:6`). The result is a subscribe button with no privacy policy or terms link, which guideline 3.1.2 requires.

**Reachability.** RevenueCat is fully wired for this app (bundle `com.lachlanoldfield.thepantry`). The current offering `default` has `$rc_monthly` → `thepantry_pro_monthly` and `$rc_annual` → `thepantry_pro_yearly`. Entitlement `pro` matches `PRO_ENTITLEMENT` (`domain/pro/purchase.ts:10`). Whether Apple returns products today depends on App Store Connect, which I couldn't read. In a TestFlight sandbox they usually come back once the products are filled in. Judgement call 1 in INTEGRATION.

**Root cause.** The preview branch's switch went away with D-052. Its replacement is a test (`LegalRows.test.tsx:29`, `it.failing`) that checks constants, not behaviour.

**Smallest fix (auto).** In `PaywallScreen`, treat `sale.state === 'on-sale'` as not on sale unless `legalLinks()` holds both a privacy link and a terms link. Show the existing "Pro isn't on sale yet" branch (`PaywallScreen.tsx:82-92`). Also add a `PaywallScreen.test.tsx` case: on-sale mock plus empty `LEGAL_URLS` means no `pro-buy` button. Keep `it.failing` until the URLs exist.

**Owner.** Host the pages and fill `LEGAL_URLS` (REL2-4). Old ID: REL-09.

### REL2-3 (S1, live + owner, CONFIRMED): no Apple token revocation on delete

`lib/account.ts:207` calls `rpc('delete_account')`. That function exists live. Nothing in `src` calls Apple's revoke endpoint. The live edge functions are `seed-kitchen` only: `apple-token` and `delete-account` (scaffolded in `supabase/functions/`) aren't deployed. Guideline 5.1.1(v) requires revoking Sign in with Apple tokens when an account is deleted.

**What's missing.** The owner's Sign in with Apple key (.p8) as a function secret, the private table, then deploying both functions. Those are the steps in the functions' header. Carry-over: K-19, REL-04, SEC-03, still open.

### REL2-4 (S1, owner, CONFIRMED): no legal or support pages, no contact

`LEGAL_URLS` is empty, so Settings › About, the paywall and the welcome agreement show nothing. `grep mailto:|support@` over `src` finds nothing, so a user has no way to reach the developer. The listing (`APP-STORE-LISTING.md` "URLs") marks the Support URL and Privacy Policy URL as required and still placeholders. The drafts in `docs/launch/privacy-policy.md` and `terms-of-use.md` still have open DECIDE points.

**The one thing Lachlan has to do.** Publish the three pages on any HTTPS host. GitHub Pages is fine; the listing says so. Then a fixer fills `lib/legal.ts`. Carry-over: K-23, REL-01, REL-02, still open.

### REL2-5 (S2, auto, CONFIRMED): CI red on `expo install --check`

The four packages are `expo-dev-client` 57.0.19 (wants ~57.0.21), `expo-image-picker` 57.0.20 (~57.0.21), `expo-splash-screen` 57.0.9 (~57.0.11) and `jest-expo` 57.0.5 (~57.0.6). These are Lane 1's numbers.

**Fix.** `npx expo install expo-dev-client expo-image-picker expo-splash-screen jest-expo`, then typecheck and test. A production EAS build compiles native code fresh, so this needs no extra step for TestFlight. Only the owner's development client needs rebuilding. Carry-over: K-28 (regressed on drift, not on the fix).

### REL2-6 (S2, live, owner's yes, CONFIRMED): live migrations out of step with the repo

**What's live.** `list_migrations` returns `20261006000618 households`, `20261006000720 household_rows_newest_wins`, two seed-kitchen versions, `20261012094607/094611` (home engine) and `20261016204729` (seed kitchen retired).

**What the repo has.** `20261006000000`, `…0100`, `…0200 accounts`, `20261008000000-0300` (lockdown, rules, invites, cleanup), `20261009000000/0100` (K-36, K-32), `20261012000000/0100` and `20261017000000`.

**So:**
- The 6 Oct, 12 Oct and 17 Oct ones are applied under different timestamps.
- `accounts` has no history row, although `delete_account` exists live.
- Six are unapplied: the four 8 Oct ones, plus `household_rows_since`, `account_rows_since` and `received_at`, none of which exist live.
- `preview_invite` is missing, so the Household screens that need it answer "Something went wrong" (K-18).

**How it hurts.** A plain `supabase db push` will try to re-run households and accounts. INTEGRATION Findings 2 also flags the 20261009 dates.

**Fix (live, owner approves).** `supabase migration repair --status applied` for the repo versions already present live, then push the six. Run the PGlite tests first. Build 25 isn't affected by additive functions; the lockdown rules can refuse old clients' writes, so check with Lane 4. Carry-over: K-18, K-32, K-36, still open.

### REL2-7 (S2, owner, CONFIRMED gap): store wording untested; RevenueCat shows no trial

`planFrom` (`purchase.ts:67-77`) reads `subscriptionPeriod`, and `trialDaysOf` (`:60-65`) turns a free `introPrice` into days. Only mock packages have ever exercised them (`lib/purchases.testing.ts:60-61`, "A$4.99 … A$44.99 … 7-day free trial").

In RevenueCat, both products have `trial_duration: null` and no indicative price. The 7-day trial the listing promises ("with a 7-day free trial on yearly") exists only if App Store Connect has an introductory offer on `thepantry_pro_yearly`. I couldn't check that.

If there's no offer, the button correctly says "Subscribe". But the listing's Pro block and `PRO.md` would then be wrong.

**Owner.** Confirm the introductory offer in App Store Connect, then buy and restore once with a sandbox account on a TestFlight build (K-38).

### REL2-8 (S2, owner, CONFIRMED): "Coming soon" in store builds

The Cupboard's ways in (`WaysIn.tsx:14`, `/cupboard/scan?kind=receipt|food`) open `ScanSheet`, which says "Coming soon" (`ScanSheet.tsx:177`) because `SCAN_CONNECTED = false` (`lib/scan.ts:13`). Guideline 2.1 treats placeholder features as incomplete.

The paywall already hides the scan benefit (`domain/pro/pro.ts:100`), and email sign-in hides itself (`store/signInWays.ts:40`). That's the pattern to reuse: hide the two scan ways in while `SCAN_CONNECTED` is false.

Carry-over: K-25, REL-06, still open (Lachlan's call, D-041).

### REL2-9 (S2, auto, CONFIRMED): the listing document is out of step

- **Case clash.** Both `docs/launch/APP-STORE-LISTING.md` (230 lines, the 7 Oct listing, read via `git show HEAD:`, copy in evidence) and `app-store-listing.md` (170 lines, 5 Oct) are tracked. On this Mac they're one file. The worktree is therefore always dirty, and EAS warns or refuses on uncommitted changes. Fix as INTEGRATION Findings 1 says: rename one through a temporary name with `git mv`.
- **Claim checks** against the 7 Oct file:
  - "270+ recipes" is **true**: 271 `reviewed` recipes ship (`provenance.ts:7`, `perf.json`). The table's "273 reviewed" is stale.
  - "Cook Mode … keeps the screen on" is true: `CookScreen.tsx:42`.
  - "Sunday reminder" is true: `lib/notifications.ts:60`.
  - "Send it to your partner in Messages or WhatsApp" is true: `lib/share.ts:26` (system share sheet).
  - "Import one from a web link" is true: `ImportLinkScreen`.
  - "High-contrast option" is true: `ui/tokens/colour.ts:155`.
  - "Sign in with Apple only if you want your kitchen backed up" is true in code (`lib/account.ts:151`). It works only once the Apple provider is set up (K-24).
  - "Invite your partner … with a link or code" is **false live today**: `preview_invite` is missing (REL2-6). The listing already says to leave this block out until Household is live.
  - "No ads and no tracking" is true (`NSPrivacyTracking: false`, `app.json`).
  - "Plates … stay on the phone" is true.
  - The **age-rating notes** ("no public posts, no strangers", line 163) are **false** while REL2-1 stands. Nutrition isn't shown anywhere (`grep kcal|calorie|nutrition` over features and ui finds nothing), so there are no health claims.

### REL2-10 (S3, auto, CONFIRMED): npm audit advisories, one at a time

| Package (installed) | Advisory | Reaches the shipped app? | Smallest safe change |
|---|---|---|---|
| `shell-quote` 1.10.0 via `react-native` → `react-devtools-core` 6.1.5 | GHSA-pqg4-j6r4-53mv, critical (range 1.8.4 to 1.10.0) | **No.** Only React DevTools' editor launcher on the developer's Mac uses it; it's never in the Hermes bundle. Regressed: K-28 had it at 1.12.0, and the regenerated lock lost it | `"overrides": { "shell-quote": "^1.12.0" }` in `package.json`, then `npm install` |
| `decode-uri-component` 0.2.2 via `expo-router` 57.0.31 → `query-string` 7.1.3 | GHSA-vcc3 (≤0.4.2) and GHSA-qr28 quadratic (≤0.5.0) | **Yes**, in the bundle: deep-link query parsing. Worst case, a crafted link hangs the JS thread. No data at risk | **None available.** Every published version is in the quadratic range, and query-string 7 can't load the ESM-only 0.5.x. Leave it and note it as SEC-17 still open. npm's `expo-router@58` isn't SDK 57 |
| `expo-router`, `query-string` | the same chain | as above | as above |
| `zod` 3.25.76 via `eslint-plugin-react-hooks` 7.1.1 | GHSA-mrhx (<4.6.6) | No, lint only | None needed. Don't force zod 4 under the plugin |
| `minimatch` 10.2.6 / 11.0.9 / 3.1.5 via Expo CLI, `@expo/fingerprint`, eslint, jest | GHSA-g3hv | No, build and lint globbing only | None. npm's `expo@52` "fix" is a downgrade: never run `npm audit fix --force` |
| `@typescript-eslint/*` 8.71.0 | via minimatch | No, lint only | Optional: let `eslint-config-expo` bring 8.72.3+ at the next Expo patch |

Carry-over: SEC-24 regressed (shell-quote). SEC-17 still open.

### REL2-11 (S3, auto, CONFIRMED): drafts flag can reach a production build (K-29)

`eas.json` `build.production` sets no `env`. An `EXPO_PUBLIC_SHOW_DRAFT_RECIPES` defined in the EAS dashboard would then turn on draft recipes, their 37.6 MB of photos, test switches and pretend Pro (`lib/build.ts:5`) in a store build.

**Fix.** Add `"env": { "EXPO_PUBLIC_SHOW_DRAFT_RECIPES": "0" }` to `build.production`. EAS documents that `eas.json` `env` wins over dashboard variables; confirm on the next build log. A TestFlight build is the production profile (build 25 was), so this covers testers too. Carry-over: K-29, REL-19, still open (now `auto`).

### REL2-12 (S3, owner, CONFIRMED): no crash reporting (K-8)

`app/_layout.tsx:18` exports an `ErrorBoundary` that renders `RootErrorScreen` with `retry`. The error itself isn't logged or kept anywhere, so a tester's crash reaches nobody except through TestFlight's own crash reports.

**What's missing.** A Sentry account, project and DSN (owner), then `@sentry/react-native` (a native module, so the owner approves it). Carry-over: K-8, REL-05, still open.

### REL2-13 (S3, owner, CONFIRMED): store and TestFlight builds show 271 recipes

`SHIPS = {'reviewed','vetted'}` (`provenance.ts:7`). The catalogue has 271 `reviewed`, 4,664 `ai-draft` and 561 `ai-assisted` recipes (`perf.json`). The 561 "ai-assisted" ones (batch 03) are hidden too.

TestFlight builds use the production profile, so testers see 271 dishes and 264 photos. Only the owner's dev and preview builds show 5,496. The listing's "270+" is honest. But anyone expecting the 5,000+ batches on TestFlight won't find them.

**Decision for Lachlan.** Whether `ai-assisted` should ship. That's one word in `SHIPS`, but it changes the bundle (PERF-1) and photo weight.

### PERF-1 (S3, auto, CONFIRMED): the store build carries the whole catalogue

**How it gets in.** `catalogue.ts:13` statically imports `./recipes.json`. Metro inlines that as one JS object literal in the main bundle: no lazy loading, no chunks. The web bundle is one 15.8 MB file (L1). Line 17 then filters in memory. Lines 28-30 keep `allById` for every recipe, so all 5,496 stay alive for `catalogueTitle`/`ALL_CATALOGUE_IDS`, which only `store/oldAppImport.ts:48-49` uses.

`catalogue.ts` is imported by `store/recipeBook.ts`, `cookable.ts`, `suggestions.ts` and others that the root layout loads. The literal is therefore built during bundle evaluation, before first render, behind the splash screen.

**Measured (Node 24 floor, medians of 7, `evidence/L6/perf.json`).**

| Step | All 5,496 | Store 271 |
|---|---|---|
| JSON in the bundle (minified) | 11.9 MB JS → **6.85 MB Hermes bytecode** | 0.94 MB → **0.55 MB bytecode** (`hermes-size.txt`) |
| Parse | 29.2 ms | about 2 ms (scaled) |
| Heap after parse | 20.2 MB | about 1.6 MB (scaled) |
| Ingredient index + kitchen | 3.4 + 0.3 ms | same |
| Search index (`indexForSearch`) | 122 ms | 10 ms |
| A search ("chicken", "chiken", "pasta tomato", "sh") | 3.4 to 7.2 ms | 0.3 to 1.1 ms |
| `whatCanICook`, 25-item cupboard | 26.9 ms | 2.2 ms |
| `rankHome` | 44.1 ms | 4.1 ms |

A phone's Hermes VM is typically several times slower than V8 on this kind of work. There's no Hermes VM on this Mac, so device time is unmeasured. Expect a few hundred ms of extra splash time and tens of MB of heap on an older iPhone, all for recipes the build never shows.

**Smallest fix, reusing the K-30 pattern** (`images.ts:277` + `draftImages.ts`):
1. Have `scripts/convert-old-recipes.mts` (the only writer, line 144) also write `src/data/catalogue/storeRecipes.json` (the `shipsInStoreBuilds` subset) and `catalogueTitles.json` (`{id: title}` for every recipe, about 0.3 MB). `recipes.json` stays as it is, so the 8 scripts that read it don't change.
2. In `catalogue.ts`, import `storeRecipes.json`. Get the full list only under `__DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1'` with a conditional `require('./recipes.json')`, as `images.ts` does. Build `ALL_CATALOGUE_IDS`/`catalogueTitle` from `catalogueTitles.json`.
3. Add a domain test that `storeRecipes.json` equals `recipes.json` filtered by `shipsInStoreBuilds`, so a stale file fails CI.
4. Measure with `expo export --platform ios` (no draft variable): the bundle should drop by about 11 MB of JS.

Old ID: none. REL-16 covered photos only.

### PERF-2 (S3, auto, CONFIRMED): cupboard matching recomputed per hook instance

`useCookableNow` (`store/cookable.ts:31-56`) keeps a per-component `useMemo`. Every caller runs its own `whatCanICook` + `quickAdds` + `savedMatches` over the whole eatable list:
- Home: `FeedScreen.tsx:59` plus inside `useHomeRanking` (`suggestions.ts:38`), so 2.
- Plan's ideas: `PlanParts.tsx:65` plus `useSlotIdeas` (`suggestions.ts:97`), so 2.
- Cupboard: `CupboardScreen.tsx:37` + `CookableList.tsx:22`.
- Browse: `BrowseSections.tsx:40`.
- Surprise: `useSurprise.ts:32`.

Tabs stay mounted, so one cupboard tick re-runs every mounted copy. Measured cost per copy: 2.2 ms with the store catalogue (fine) and 26.9 ms with all recipes, plus `rankHome` 44 ms per ranking hook and a 122 ms search index on Browse. In Node that's roughly 0.3 s per tap in dev and preview builds, likely over 1 s on a phone.

**Fix.** A single-entry module-level cache in `useCookableNow`, keyed on the input references (`items, shelf, diet, avoid, hidden, bookmarks, recipes, today`), so all callers share one result. Test: two components rendered with one store state call `whatCanICook` once (spy).

### PERF-3 (S4, auto, LIKELY): timeouts left running after unmount

Most timers clean up: Toast, AccountSection, useCookTimers (ticks only while timers run), Tour, CodeStep, AccountNudge, today.ts, sync.ts, fetchPage, published, homeFeedReads and savedState.

Four don't:
- `ActionSheet.tsx:28`, `setTimeout(a.onPress, MOTION.slow)`
- `DrawerScreen.tsx:48`, `goBack` after `MOTION.quick`
- `SettingsScreen.tsx:126`, starts the tour after `TOUR.startDelay`
- `accountActions.ts:84`, merge retry; it does check `needsMerge`

The first three can act after the screen has gone, for example a double `goBack`. Keep the id in a ref and clear it on unmount, as `SurpriseScreen.tsx:45-46` does.

### PERF-4 (S4, auto, LEAD): long lists not virtualised

These are virtualised: Browse results (`RecipesScreen.tsx:145` FlatList), the community feed (`PublishedList.tsx:60`), Library and collections (`ui/primitives/ListScreen.tsx`, REL-14 still fixed) and the cookable list.

The shopping list maps every group inside a ScrollView (`ShoppingListView.tsx:124-200`). That's fine at 50 rows; a big plan's list (150+ lines) renders all of them. I didn't measure it. Only convert if a phone with a year of data shows jank (K-39).

### REL2-14 (S4, auto, CONFIRMED): no Node pin for EAS

`engines` says `>=22`, CI uses 22 and this Mac runs 24.21. `eas.json` has no `node`, so EAS picks its image default. Add `"node": "22.20.0"` (or the CI version) to the `production`, `preview` and `development` profiles.

### REL2-15 (S4, live, CONFIRMED): unused RevenueCat entitlement

Entitlement `The Pantry Pro` (`entl48c5745bc2`) has no products. The code uses `pro` only. It's harmless, but archiving it avoids confusion. Undoable (unarchive), and no effect on build 25.

### REL2-16 (S4, owner, CONFIRMED): no OTA updates (K-27)

There's no `expo-updates` and no `runtimeVersion` (build 25 has `runtimeVersion null`, `channel null`). Every fix needs a store build. Owner's call; carry-over K-27, REL-10, still open.

### REL2-17 (S4, auto, CONFIRMED): RevenueCat SDK on a caret range

`"react-native-purchases": "^10.11.0"`. K-28 pinned the other native modules, but a fresh lock could take a new 10.x with a different `PurchasesHybridCommon` pod. Pin to `~10.11.0`.

## Release config, line by line (no finding unless listed above)

- `app.json`:
  - name "The Pantry", version 2.0.0 (remote build numbers, `autoIncrement`, so the next build is 26).
  - Bundle `com.lachlanoldfield.thepantry`, matching RevenueCat and EAS.
  - Portrait only, `supportsTablet: false`, `usesAppleSignIn: true`, `ITSAppUsesNonExemptEncryption: false`, no `UIBackgroundModes` (timers use local notifications), no associated domains (K-26 open).
  - Photo and camera strings are specific ("the photos you choose when you share a dish you cooked"), microphone off. Both are used (`lib/photos.ts:22-28`).
  - `typedRoutes` on; splash and icon PNGs are under 50 KB.
- Privacy manifest (K-35, SEC-23): the app's `NSPrivacyAccessedAPITypes` is a superset of every manifest under `node_modules`:
  - UserDefaults CA92.1: RN, expo-constants, expo-system-ui, expo-notifications.
  - FileTimestamp C617.1: RN, async-storage, expo-application. 0A2A.1 and 3B52.1: expo-file-system.
  - SystemBootTime 35F9.1: RN timing.
  - DiskSpace E174.1/85F4.1: expo-file-system.

  RevenueCat (`PurchasesHybridCommon` 19.5.0) and SDWebImage bring their own manifests through CocoaPods. Still open: one look at the generated `PrivacyInfo.xcprivacy` after prebuild. Low risk.
- Collected data types: user ID, email, name, other content, product interaction, purchase history, all linked and not tracking. That matches what the client sends (`L1-INVENTORY` §5). Plates stay local, so photos aren't declared, which is correct.
- Error boundary: root only (REL2-12). Dev routes `/dev/gallery` and `/dev/home-viewer` redirect home in store builds (`app/dev/*.tsx`).

## App Review, guideline by guideline

| Guideline | Verdict | Evidence |
|---|---|---|
| 1.2 user content | Passes as user content: the client never writes `published_recipes` (`L1-INVENTORY` §5), and plates and household stay private. **Fails on honesty** for the fictional cooks | REL2-1 |
| 2.1 completeness | At risk: "Coming soon" scan sheet; Household needs live migrations | REL2-8, REL2-6 |
| 2.3 accurate listing | Description claims check out; the age-rating notes don't | REL2-9 |
| 3.1.1 / 3.1.2 | Prices come from the store (`priceString`, `terms.ts:15`; no price literals outside mocks). Length beside price is ported (K-38). Restore button: `BuyPanel.tsx:85`. **No terms or privacy links** | REL2-2, REL2-7 |
| 4.8 Sign in with Apple | Passes: Apple is the only sign-in (email off) | `store/signInWays.ts:40` |
| 5.1.1(v) | Deletion in the app works (`account.ts:207`, function live). **No Apple revocation** | REL2-3 |
| 5.1.2 | Privacy manifest accurate; App Privacy answers in App Store Connect unverified (owner) | K-23 |
| Health or nutrition | No nutrition, no health claims shown | grep |

## Photo weight (K-30, REL-16)

`evidence/L6/assets.json`:
- `assets/recipes` holds 625 WebP files, 61.7 MB, no JPEG or PNG left.
- A store build bundles **264 files, 24.1 MB** (270 map entries; shared photos counted once). Every entry belongs to a shipping recipe.
- 361 draft-only files (37.6 MB) are excluded by the conditional `require` (`images.ts:277`).
- 0 files are used by no recipe, and 0 byte-identical duplicates.
- Largest shipped file: `turkish-pide.webp` 350 KB, and it's the only one over 300 KB that ships.

Not checked: near-duplicates among the 221 newly converted photos (needs perceptual hashing) and their look. Lane 7 owns wrong-dish photos. Carry-over: K-30 and REL-16 still fixed, re-measured statically, not with `expo export --platform ios`.

**App size estimate.** About 24.1 MB of photos, a Hermes bundle of roughly 9 to 10 MB (6.85 MB is catalogue; PERF-1 cuts about 6.3 MB), 0.4 MB of Ionicons, plus native frameworks (unmeasured, typically 25 to 35 MB for RN 0.86 + Expo + RevenueCat). That's roughly 60 to 70 MB installed, about 55 to 64 MB after PERF-1.

## Sync pulls (K-36)

The client pulls incrementally when the server has `<table>_since`, and falls back to a full paged read on PGRST202/42883 (`lib/pullRows.ts:43-90`). Live has neither function nor the `received_at` column, so every return to the app does a full pull. Today that's harmless (0 `household_rows`, 0 `account_rows` live). It grows with use. Applying it is REL2-6. K-36 still open (live).

## Carry-over

| ID | Status | How checked |
|---|---|---|
| REL-01, REL-02, REL-24 / K-23 | still open (owner) | `lib/legal.ts:6`; listing |
| REL-03 / K-24 | still open (owner); not readable through the tools allowed | |
| REL-04 / K-19 / SEC-03 | still open | edge functions list |
| REL-05 / K-8 | still open | no Sentry in `package.json` or `src` |
| REL-06 / K-25 | still open (REL2-8) | |
| REL-07 | still fixed | `app.json` plugin strings |
| REL-08 | still fixed | manifest vs client tables |
| REL-09 / K-38 | regressed in behaviour (REL2-2); wording ported, sandbox check owed (REL2-7) | |
| REL-10 / K-27 | still open (owner) | build 25 runtimeVersion null |
| REL-11 / K-26 | still open (owner, domain) | no associated domains |
| REL-12 | still fixed, but CI red (REL2-5) | L1 §7 |
| REL-13 / K-20 / SEC-10 | still open (native module) | not re-traced (Lane 4) |
| REL-14 | still fixed | `ListScreen.tsx` FlatList |
| REL-16 / K-30 | still fixed | `assets.json` |
| REL-17, REL-18 / K-28 | regressed on drift (REL2-5); ranges pinned except RevenueCat (REL2-17) | |
| REL-19 / K-29 | still open, now `auto` (REL2-11) | `eas.json` |
| REL-20, REL-21, REL-22, REL-23 | not re-checked (Lane 5) | |
| REL-25 / K-31 | Lane 7 | |
| SEC-17 | still open, no fixed version exists | REL2-10 |
| SEC-23 / K-35 | still open (prebuild check), node_modules side passes | manifest grep |
| SEC-24 | regressed (shell-quote 1.10.0) | `npm ls shell-quote` |
| K-36, K-32, K-18 | still open (live, REL2-6) | SQL |
| K-12 | still open (owner phone) | |

## Coverage

34 lane items:
- Performance (8): cold start, search and rank, lists, re-renders, sync, assets, size, timers.
- Config (12): the `app.json` fields above, `eas.json`, privacy manifest, crash reporting, OTA, error boundary, deps and audit.
- App Review (8).
- RevenueCat (3): app match, identifiers, buyable.
- Launch pack (3).

Covered 30. Not covered: on-device timings, App Store Connect state (products, intro offer, App Privacy), the generated `PrivacyInfo.xcprivacy`, and whether anything is buyable right now.

## Not tested, and why

- Device or Hermes runtime timings: no simulator or phone allowed, and there's no Hermes VM on the Mac. Only the bytecode was compiled.
- `expo export --platform ios` size: other lanes are using `dist/`, and the brief says don't re-export.
- App Store Connect: off limits. So I couldn't see whether the products are "Ready to Submit" or approved, the prices, or the intro offer.
- Re-renders profiled with React DevTools: reasoned from the code and from timing the pure functions.
- Supabase dashboard settings (K-24): not exposed to read-only SQL.

## Refuted

- "Store builds bundle drafts' photos": no. The `images.ts:277` conditional require works, and every map entry is a shipping recipe.
- "Search walks every recipe per keystroke": no. The vocabulary is matched once per query (`search.ts:64-75`) and the index is memoised per eatable list.
- "Privacy manifest misses an API category": no. The app's list is a superset of every `node_modules` manifest.
- "The RevenueCat project may be Elurvo's": no. App `app7070cd1ca7` has bundle `com.lachlanoldfield.thepantry`.

## What stands between this branch and a TestFlight build (ordered)

1. `auto`: Fix the `docs/launch` case clash with `git mv` through a temporary name, so the tree is clean for EAS (REL2-9).
2. `auto`: `npx expo install expo-dev-client expo-image-picker expo-splash-screen jest-expo`. Add the `shell-quote ^1.12.0` override. Make lint ignore `e2e-report/` (L1 REPO-1). CI green (REL2-5, REL2-10).
3. `auto`: Paywall shows "not on sale yet" while the legal links are empty, with a test (REL2-2).
4. `auto`: Hide `HomeForYou` in store builds until Lachlan picks label or hide (REL2-1).
5. `auto`: In `eas.json`, set production `env` `EXPO_PUBLIC_SHOW_DRAFT_RECIPES: "0"`, a Node pin, and `react-native-purchases ~10.11.0` (REL2-11, REL2-14, REL2-17).
6. `auto` (recommended, not blocking): Ship only the store catalogue (PERF-1) and share one cupboard match (PERF-2).
7. `auto`: Commit on a branch Lachlan approves for building; run typecheck, lint and test, plus the e2e failure Lane 2 owns.
8. `live`: Lachlan says yes. `supabase migration repair` for the already-applied versions, then apply the 8 Oct four plus K-36/K-32 (REL2-6). Without this, Household is broken in the build.
9. `owner`: Supabase dashboard: anonymous sign-ins, the Apple provider, OTP and SMTP (K-24).
10. `owner`: `eas build --profile production --platform ios`, then `eas submit` (build 26).
11. `owner`: On the phone, the old-app import (K-12), a sandbox buy, restore and trial wording (REL2-7), and K-39's checks.

Before App Store submission (not TestFlight): host the legal and support pages and fill `LEGAL_URLS` (`owner`, then `auto`; REL2-4); deploy Apple revocation (`live`, `owner` .p8; REL2-3); decide on the fictional cooks (`owner`; REL2-1); hide or ship scanning (`owner`; REL2-8); Sentry (`owner`; REL2-12); fill in App Privacy and the age rating (`owner`; REL2-9).
