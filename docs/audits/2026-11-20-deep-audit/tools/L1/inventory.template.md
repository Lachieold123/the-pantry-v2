# L1 Inventory: what exists in The Pantry v2 at `8bbbacd` (branch `audit/deep-1120`)

Built by Lane 1 on 20 Nov 2026 from source (grep and small scripts in `tools/L1/`). Other lanes measure coverage against this file. Counts: 44 route files (41 screens), 20 feature folders, 80 domain modules, 15 persisted stores (+16 store helper files), 8 Supabase tables, 11 RPCs, 2 realtime channel types, 0 Edge Function calls, 99 Jest/node test files, 26 Maestro flows, 8 Playwright specs.

Machine-made tables below are pasted from `evidence/L1/inv-*.md` (regenerate with `node docs/audits/2026-11-20-deep-audit/tools/L1/inventory.mjs`, then `assemble.mjs`).

## 1. Routes (`src/app`)

Every route file is thin (4 to 11 lines, only `_layout.tsx` is long at 107). The root stack is declared in `src/app/_layout.tsx`; `unstable_settings.initialRouteName = '(tabs)'`, so a link into any screen still has the tabs underneath. URL scheme `thepantry` (app.json). Presentation column is from the root `<Stack>`.

| Route (URL path) | Screen component | Presentation | Params | Notes |
|---|---|---|---|---|
| `/` (tabs `index`) | `feed/FeedScreen` | tab "Home" | none | Home: Tonight, hero, For you (`HomeForYou`), rails, first-run checklist |
| `/plan` (tabs) | `plan/PlanScreen` | tab "Plan" | none | week strip, day slots; plan-ahead gate (Pro) |
| `/list` (tabs) | `shopping/ShoppingScreen` | tab "List" | none | derived from the plan |
| `/cupboard` (tabs) | `cupboard/CupboardScreen` | tab "Cupboard" | none | |
| `/welcome` | `welcome/WelcomeScreen` | stack, fade, no swipe-back | none | `(tabs)/_layout` redirects here while `useNeedsWelcome()` |
| `/menu` | `shell/DrawerScreen` | transparentModal, no animation | none | the side menu draws its own slide |
| `/settings` | `settings/SettingsScreen` | stack | none | |
| `/library` | `saved/LibraryScreen` | stack | `tab?: cookmarks \| collections \| mine \| recent` (unknown value falls back to cookmarks) | |
| `/saved` | `saved/LibraryScreen` | stack | none | old address, opens Cookmarks tab (see `saved/index.tsx`) |
| `/collections` | `saved/LibraryScreen` | stack | none | old address, Collections tab |
| `/collections/[id]` | `saved/CollectionScreen` | stack | `id` | |
| `/my-recipes` | `saved/LibraryScreen` | stack | none | old address, My recipes tab |
| `/recent` | `saved/LibraryScreen` | stack | none | old address, Recent tab |
| `/stats` | `saved/StatsScreen` | stack | none | cook stats |
| `/browse` | `recipes/RecipesScreen` | stack | `search?` | opened from Home's search bar |
| `/filters` | `recipes/FiltersScreen` | stack | none | |
| `/surprise` | `surprise/SurpriseScreen` | stack | none | |
| `/recipe/[id]` | `recipe/RecipeScreen` | stack | `id` | catalogue or own recipe id; share text uses `thepantry://recipe/<id>` |
| `/recipe/[id]/plan` | `recipe/PlanRecipeSheet` | formSheet 0.75/1 | `id` | |
| `/recipe/[id]/collect` | `recipe/CollectSheet` | formSheet | `id` | |
| `/recipe/[id]/list` | `recipe/AddToListSheet` | formSheet | `id`, `servings?` | |
| `/recipe/[id]/cook` | `cook/CookScreen` | fullScreenModal, no swipe | `id`, `servings?` | Cook Mode |
| `/plan/add` | `plan/AddToPlanSheet` | formSheet | `day`, `slot?` | a link to a later day still hits the plan-ahead check |
| `/cupboard/add-list` | `cupboard/AddListSheet` | formSheet | none | |
| `/cupboard/shelf` | `cupboard/ShelfSheet` | formSheet | none | |
| `/cupboard/scan` | `cupboard/ScanSheet` | formSheet | `kind?: receipt \| food` (anything else = receipt) | "Coming soon" while `SCAN_CONNECTED=false` |
| `/cupboard/cookable` | `cupboard/CookableList` | stack | none | "what can I cook" |
| `/my-recipe/edit` | `editor/RecipeEditorScreen` | modal, no swipe | `id?`, `from?`, `title?` | |
| `/my-recipe/import` | `editor/ImportLinkScreen` | formSheet | none | link import (fetchPage) |
| `/plate/[id]` | `plates/PlateScreen` | stack | `id` | a shared dish |
| `/post` | `plates/PostScreen` | modal | none | share a dish (draft kept) |
| `/feed` | `feed/CommunityFeedScreen` | stack | none | published recipes (Supabase) |
| `/feed/[id]` | `recipe/PublishedRecipeScreen` | stack | `id` | |
| `/cooks/[id]` | `feed/CookScreen` | stack | `id` | cook profile |
| `/household` | `household/HouseholdScreen` | stack | none | |
| `/join/[code]` | `household/JoinScreen` | formSheet | `code` | deep link `thepantry://join/<CODE>` (household invite text) |
| `/account` | `account/AccountSheet` | formSheet | `moment?: household \| cookmarks \| own-recipe` | offered once per moment by `AccountNudge` |
| `/account/email` | `account/EmailSheet` | formSheet | none | email code step |
| `/pro` | `pro/PaywallScreen` | formSheet | `from?: plan-ahead \| collections \| my-recipes \| imports \| scans` | |
| `/dev/gallery` | `dev/GalleryScreen` | stack | none | `__DEV__` only, else redirect `/` |
| `/dev/home-viewer` | `dev/HomeViewerScreen` | not in root Stack list | none | `__DEV__` or `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`; ships in TestFlight preview builds |
| `+not-found` | `app/NotFoundScreen` | | | |

Hostile-link surface (for lane 4): every route above is reachable as `thepantry://<path>` because Expo Router links by file path; params are strings from the URL (`day`, `slot`, `servings`, `id`, `code`, `tab`, `kind`, `moment`, `from`, `search`, `title`). `/dev/home-viewer` is reachable in preview builds.

Other outbound links: `Linking.openURL` for legal links (`lib/legal.ts`, all three currently undefined so none show), the manage-subscriptions URL (`settings/ProSection`), recipe source and photo credit links, `Share.share` in `lib/share.ts` (recipe text, shopping list, household invite).

### Routes as the code sees them (generated)

{{inv-routes.md}}

## 2. Screens and their testIDs (generated)

One row per feature file that sets a `testID`. Dynamic ids (such as `recipe-card-${id}`) are listed with their template. Feature folder contents:

{{inv-featurefiles.txt}}

{{inv-testids.md}}

## 3. Stores (`src/store`) and persisted keys

All persisted through `persistentStorage()` (`src/store/storage.ts`, AsyncStorage). Key prefix `the-pantry-v2/`. Corrupt blob is backed up and the store starts empty (`lib/savedState`). Startup waits for hydration of the stores in `features/app/useAppReady.ts` for at most 4,000 ms (`STARTUP_WAIT_MS`), then opens anyway.

| Store file | Persisted key | Ver | `migrate` | Persisted fields | In the startup hydration list? | Syncs as rows |
|---|---|---|---|---|---|---|
| `preferences.ts` | `preferences` | 4 | yes (fills defaults, spreads saved) | appearance, highContrast, units, diet, avoid, cuisines, weeknight, sundayReminder, intents, skill, termsAcceptedAt, onboarded | yes | `prefs` |
| `plan.ts` | `plan` | 1 | none | entries, listEdits | yes | `plan`, `tick`, `removal`, `extra` |
| `saved.ts` | `saved` | 1 | none | bookmarks, collections, hidden, recentlyViewed | yes | `bookmark`, `collection`, `hidden`, `recent` |
| `cookLog.ts` | `cook-log` | 1 | none | log | yes | `cooklog` |
| `cupboard.ts` | `cupboard` | 2 | yes (adds `shelf`) | items, shelf, moveTickedToCupboard | yes | `cupboard` |
| `myRecipes.ts` | `my-recipes` | 1 | none | recipes | yes | `myrecipe` (and `recipe` copies in a household) |
| `oldAppImport.ts` | `welcome-back` | 1 | none | message | yes | no |
| `pro.ts` | `pro` | 1 | none | entitlement, importsAt, previewLimits, pretendPro | yes | no |
| `household.ts` | `household` | 1 | none | household, userId, mirror, pending, setAside, sharedRecipes, lastSyncedAt, rejoin, cursor | yes | engine for scope `household` |
| `account.ts` | `account` | 1 | none | who, device, needsMerge, code, offered, mirror, pending, setAside, lastSyncedAt, cursor | yes | engine for scope `account` |
| `checklist.ts` | `checklist` | 1 | none | started, dismissed | yes | no |
| `plates.ts` | `plates` | 1 | none | plates, draft | **no** | no |
| `tour.ts` | `tour` | 1 | none | seen | **no** | no |
| `scans.ts` | `scans` | 1 | none | usedAt (free scan allowance) | **no** | no |
| `homeEvents.ts` | `home-events` | 1 | none | events, asCookId (Home engine interaction log, local only until `home_events` migration is applied) | **no** | no |

Not persisted (derive or session only): `recipeBook.ts` (every recipe: catalogue + own), `shoppingList.ts` (derived from plan, never stored), `cookable.ts`, `eatable.ts`, `suggestions.ts` (Home ranking, Plan ideas), `recipeFilters.ts` (Browse filters, session only), `pendingImport.ts`, `signInWays.ts`. Actions and sync glue: `accountActions.ts` (sign in/out/delete), `accountSync.ts`, `householdActions.ts`, `proSync.ts` (RevenueCat listener), `sync.ts` + `syncTypes.ts` (one engine per scope, `AppState` listener, flush timer), `reset.ts` (back to fresh install on sign-out), `storage.ts`.

Row kinds that sync (`src/domain/sync/types.ts`): kitchen `plan, tick, removal, extra, cupboard, recipe`; personal `bookmark, collection, hidden, myrecipe, recent, cooklog, prefs`. Caps: key 1 to 200 chars, data under 60,000 bytes (`domain/sync/limits.ts`, server 64 KB).

Observation for lane 3: `plates`, `tour`, `scans` and `homeEvents` are persisted but not awaited at startup, and `startSync` waits only for the 11 listed stores.

## 4. Domain modules (`src/domain`, 80 files, generated)

"importers" counts non-test files in `src` that import the module; "test" means a test file sits next to it (a module with `no` may still be covered by a neighbour test; see the coverage table in L1-BASELINE). `home-engine/simulate.ts` has 0 importers in `src` because `scripts/home-engine-sim.mts` uses it.

{{inv-domain.md}}

## 5. Supabase and network (what the client touches)

Project `eozyhllkvajvrecojdxu` (URL in `src/lib/backend.ts`; the publishable key is in the same file). Client in `src/lib/supabase.ts` (session in AsyncStorage, `autoRefreshToken`, `detectSessionInUrl: false`). Created on first use.

| Kind | Name | Called from | Purpose |
|---|---|---|---|
| table read | `profiles` (`display_name`) | `lib/account.ts:66,123` | account display name (read, upsert) |
| table read | `published_recipes` | `lib/published.ts:56,79`, `lib/homeFeedReads.ts:29` | community feed, Home "For you" |
| table read | `cooks` | `lib/published.ts:95`, `lib/homeFeedReads.ts:58` | cook profiles (99 seed cooks) |
| table read | `follows` | `lib/homeFeedReads.ts:45` | who a cook follows (Home engine) |
| table read | `household_members` | `lib/household.ts:90,96` | membership |
| table read | `households` | `lib/household.ts:95` | household name |
| table read/write | `household_rows` | `lib/pullRows.ts`, `lib/pushRows.ts` (upsert `household_id,kind,key`) | shared kitchen rows |
| table read/write | `account_rows` | same | personal rows |
| RPC | `household_rows_since`, `account_rows_since` | `lib/pullRows.ts:58` (fallback `pullEverything` plain select) | incremental pull by `received_at` cursor (K-36) |
| RPC | `create_household`, `join_household`, `leave_household`, `create_invite`, `revoke_invites`, `remove_member`, `preview_invite` | `lib/household.ts:61-79` | household lifecycle |
| RPC | `delete_account` | `lib/account.ts:207` | account deletion (then local `signOut`) |
| Auth | `getSession`, `signInAnonymously`, `signInWithIdToken` (apple), `linkIdentity` (apple), `signInWithOtp` (create user / not), `verifyOtp`, `updateUser({email})`, `signOut({scope:'local'})` | `lib/account.ts`, `lib/household.ts:35-41` | anonymous household sign-in; Apple; email code |
| Realtime | private broadcast topics `household:<id>`, `account:<user id>` (event `row`) | `lib/liveRows.ts:56` | live rows; falls back to `postgres_changes` on `household_rows`/`account_rows` if the topic is refused (`LEGACY`, line 44) |
| Edge Functions | none called by the client | | `supabase/functions/` holds `apple-token`, `delete-account`, `seed-kitchen`, `seed-kitchen-v8-retired`, `_shared/apple.ts`. Account delete uses the RPC, not the `delete-account` function; no Apple token revocation call in `src` (K-19) |
| Storage buckets | none used | | |
| Other network | `fetch(url)` of arbitrary pages, 15 s abort (feed reads 15 s, Home reads 20 s), `Accept: text/html` | `lib/fetchPage.ts:22` (import from a link) | recipe import |
| Other network | RevenueCat SDK | `lib/purchases.ts` | `Purchases.configure` with the public iOS key; products `thepantry_pro_monthly`, `thepantry_pro_yearly`, packages `$rc_monthly`, `$rc_annual` |

Migrations in the repo (14 applied-by-intent plus 1 pending), generated:

{{inv-migrations.md}}

`supabase/tests/rules.test.mjs` and `sync.test.mjs` (PGlite) cover the migrations; CI runs only `rules.test.mjs`.

## 6. Flags, env vars, plan gates, build switches

| Switch | Defined in | Value now | Effect |
|---|---|---|---|
| `EXPO_PUBLIC_SHOW_DRAFT_RECIPES` | `eas.json` (`development`, `preview` set `"1"`; `production` unset); CI export sets `1` | unset in production | with `__DEV__`, drives `INTERNAL_BUILD`; also shows draft (non-vetted) recipes (`data/catalogue/catalogue.ts:17`, `images.ts:277`), `/dev/home-viewer`, `HomeForYou` testing mode (`feed/HomeForYou.tsx:23`) |
| `INTERNAL_BUILD` | `lib/build.ts` = `__DEV__ \|\| SHOW_DRAFT_RECIPES==='1'` | false in a store build | Settings "Pro" testing switches (`settings/ProSection.tsx:42`), pretend Pro (`store/pro.ts:89`), preview free limits (`store/pro.ts:102,119`) |
| `__DEV__` | Metro | false in release | `/dev/gallery`, Settings dev row (`SettingsScreen.tsx:107`), RevenueCat log level (`lib/purchases.ts:84`) |
| `SCAN_CONNECTED` | `lib/scan.ts:13` | `false` (hard-coded) | Scan sheets say "Coming soon" (`ScanSheet.tsx:95`, 177); paywall hides the scan benefit (`PaywallScreen.tsx:54`) |
| "purchases ready" (`PURCHASES_CONNECTED` in the brief; the code names it `usePurchasesReady`) | `store/pro.ts:93`, `store/proSync.ts` | true only on an iPhone build with the RevenueCat native module and products on sale | free limits apply only when on sale (`store/pro.ts:100,113`); Expo Go, web, Android answer "not-connected" |
| `LEGAL_URLS` | `lib/legal.ts:7` | `{}` (all undefined) | Settings About and paywall show no legal links; welcome shows no agreement; a test (`LegalRows.test.tsx` REL-09, `it.failing`) guards that Pro cannot go on sale first |
| `typedRoutes` | `app.json` experiments | true | needs `.expo/types/router.d.ts` (CI generates it) |
| `E2E_PORT` | `e2e/web/playwright.config.ts` | default 8790 | Playwright web server port |
| `CI` | Playwright config | | `retries: 1` only when `CI` set |

Plan gates (free vs Pro), from `domain/pro/pro.ts`:

| Gate | Free limit | Where checked |
|---|---|---|
| Collections | 3 | `store/pro.ts:141` via `overFreeLimit('collections')`, opens `/pro?from=collections` |
| My own recipes | 10 | same, `'my-recipes'` |
| Link imports | 5 a month (`importsAt` timestamps in `pro` store) | same, `'imports'` |
| Scans | 3 a month free, 15 a day Pro (`SCAN_LIMITS`) | `store/scans.ts`, `domain/cupboard/scan.ts` (scan itself is off) |
| Plan ahead | free plans only the week being shopped for (`planDayLocked`) | `usePlanAhead` in `DaySlots`, `PlanParts`, `PlanRecipeSheet`, `AddToPlanSheet`; `PlanScreen.tsx:99` |

Limits apply only when purchases are ready (`useLimitsApply`). Hard-coded identifiers: RevenueCat iOS public key (`lib/purchases.ts:32`, a public SDK key, not a secret), bundle id `com.lachlanoldfield.thepantry`, EAS project id, ASC app id `6774453962`, Apple team id (in `eas.json`).

Permissions and entitlements (`app.json`): Apple sign-in on; camera and photos strings from `expo-image-picker`; microphone off; `ITSAppUsesNonExemptEncryption=false`; no `UIBackgroundModes`; no associated domains; iPad off; portrait only; privacy manifest declares UserID, EmailAddress, Name, OtherUserContent, ProductInteraction, PurchaseHistory (all linked, no tracking) and API reasons for UserDefaults (CA92.1), FileTimestamp (C617.1, 0A2A.1, 3B52.1), SystemBootTime (35F9.1), DiskSpace (E174.1, 85F4.1).

## 7. Notifications, timers, background work

| What | Where | Notes |
|---|---|---|
| Local notification: Cook Mode timer done | `lib/notifications.ts` `scheduleAt`/`cancelScheduled`, used by `features/cook/useCookTimers.ts` | permission asked on first need (`ensureNotificationPermission`); handler shows banner, list, sound |
| Local notification: Sunday plan reminder | `lib/notifications.ts` `setSundayReminder` (id `sunday-plan`, weekly, Sunday 16:00, device time) | text `SUNDAY_REMINDER_TEXT`; toggled in Settings and welcome |
| Push notifications | none (map §3: no server push) | `expo-notifications` plugin only |
| Background tasks | none (no TaskManager, no background fetch, no `UIBackgroundModes`) | |
| Keep awake | `activateKeepAwakeAsync('cook-mode')` in `cook/CookScreen.tsx:42`, released on unmount | |
| Timers and listeners | `cook/useCookTimers.ts:21` 500 ms tick; `lib/today.ts` midnight timer + `AppState`; `store/sync.ts:35,103,208` flush timer + `AppState`; `settings/AccountSection.tsx:76` 60 s tick; `account/CodeStep.tsx:26`; `account/AccountNudge.tsx:20`; `ui/patterns/Toast.tsx:66`; `tour/TourOverlay.tsx:31`, `tour/useSettledTarget.ts:31-49`; `surprise/SurpriseScreen.tsx:45,71`; `shell/DrawerScreen.tsx:48`; `ui/patterns/ActionSheet.tsx:28`; `store/accountActions.ts:84`; request aborts in `lib/fetchPage.ts:18`, `lib/published.ts:43`, `lib/homeFeedReads.ts:15`; `lib/savedState.ts:37` hydrate timeout | cleanup for each is lane 6's check |
| Realtime channels | `lib/liveRows.ts` (`listenRows`) opened by sync, returns a stop fn | |

## 8. Scripts

`package.json` scripts (all run in the baseline, see L1-BASELINE):

| Script | Command | In CI? |
|---|---|---|
| `start`, `ios`, `web` | expo start variants | no |
| `typecheck` | `tsc --noEmit` | yes |
| `lint` | `eslint .` | yes |
| `format`, `format:check` | prettier on `src/**/*.{ts,tsx}`, `scripts/**/*.mts`, `e2e/**/*.{ts,mjs}` | check: yes |
| `test` | `test:domain` then `test:ui` | split into two CI steps |
| `test:domain` | `tsx --test` over `src/domain/**`, `src/lib/*.test.ts`, `src/ui/tokens/*.test.ts`, `scripts/*.test.mts` | yes, `TZ=Australia/Sydney` |
| `test:ui` | `jest` (jest-expo) | yes |
| `test:web` | Playwright, `e2e/web/playwright.config.ts`, projects light and dark, iPhone 15 Pro device | yes, job `journeys` |
| `export:web` | `expo export --platform web` | CI runs `npx expo export --platform web --clear` with `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1` instead |
| `catalogue:convert` | rebuild catalogue from the old app | no |
| `catalogue:check-ingredients` | ingredient coverage | yes |
| `catalogue:check-house`, `check-text`, `validate`, `photo-sources`, `photos` | house batches and photo maps | no (not in CI) |
| `feed:verify` | `scripts/verify-feed-payload.mts` | no |
| (none) `node --test supabase/tests/*.test.mjs` | PGlite DB rules | CI runs `rules.test.mjs` only |
| (none) `npx expo install --check` | SDK package versions | yes (CI step) |

Files in `scripts/` (generated):

{{inv-scripts.md}}

`scripts/data/` holds house recipe batches (`house-recipes/batch-01..04*.json`, 4 file families), batch-03 working files, `recipe-fixes.json`, `recipe-tags.json`, `shared-photos.json`, review files. `docs/backups/` holds 17 Oct feed payload chunks and Supabase table snapshots (about 5 MB tracked).

Tests: 99 test files (`inv-tests.txt`), 8 Playwright specs in `e2e/web` (`account, audit-fixes, cook-and-cupboard, first-run, home, library, plan-and-list, pro-and-household`), 26 Maestro flows plus 5 subflows in `.maestro` (run in Expo Go via `scripts/run-maestro.command`), 2 PGlite DB test files.

## 9. Test coverage by feature folder (generated)

Non-test files vs test files per folder (`src/features/*`, `src/store`). A zero here is a feature with no Jest test of its own; see L1-BASELINE section "Tests" for what the Playwright and Maestro suites add.

{{inv-featuretests.md}}

## 10. Unused code candidates

From `inv-unused-exports.md` (a named export no other file in `src` mentions): 8 flagged; 5 belong to `home-engine/simulate.ts` (used by `scripts/home-engine-sim.mts`, so not dead). Truly unused: `domain/testing/fixtures.ts plainKitchen`, `lib/purchases.ts purchasesConfigured`, `lib/today.ts refreshToday`. A further 121 exports are used only inside their own file (`internal use only` rows in the evidence file). No `package.json` dependency is unused outright: `expo-asset`, `expo-dev-client`, `expo-linking`, `react-dom`, `react-native-web`, `react-native-worklets` are peers or platform pieces and are not imported by name.
