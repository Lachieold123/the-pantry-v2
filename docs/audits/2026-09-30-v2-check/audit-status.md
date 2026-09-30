# Audit status: the 141 original-app findings, checked against v2

- **Date:** 30 September 2026
- **v2 checked:** `/home/claude/the-pantry-v2` at `7617a17` (P3 done)
- **Audit:** `docs/audits/2026-09-30-original-app/`
- **Method:** static reading of v2's source, config, lint rules, tests and docs.
  - `node_modules` isn't installed in this workspace, so typecheck, lint and tests weren't run.
  - Every PREVENTED claim was checked against the code, not the comments.
  - Line numbers are v2 file:line unless marked otherwise.

## Summary

| Status | ARCH | SEC | SOC | PERF | QUAL | Total |
|---|---|---|---|---|---|---|
| PREVENTED | 7 | 2 | 1 | 9 | 17 | **36** |
| GUARDED BY PLAN | 5 | 13 | 20 | 10 | 1 | **49** |
| OPEN IN V2 | 11 | 10 | 9 | 10 | 15 | **55** |
| NOT APPLICABLE | 0 | 0 | 0 | 0 | 1 | **1** |
| **Total** | 23 | 25 | 30 | 29 | 34 | **141** |

The 55 OPEN items fall into two groups:
- **32 are problems in v2's code or config today.**
- **23 are plan gaps**, marked *(plan gap)* in the tables. The feature isn't built yet, and no parity-plan rule or phase covers the specific mechanism. The plan's opening line ("none of the 141 findings may come across") isn't counted as coverage.

### The most important findings

1. **A single corrupt saved blob stops the app opening (ARCH-6 / PERF-6).** This is worse than v1, which wiped the data instead.
   - Zustand v5 `persist` never sets `hasHydrated` when a read or `JSON.parse` fails. Its `.catch` only calls `onRehydrateStorage(undefined, e)`.
   - `preferencesHydrated()` (`src/store/preferences.ts:109-117`) and the old-app import's `hydrated()` gate (`src/store/oldAppImport.ts:48`, all six stores, on every launch) then never resolve.
   - So `useAppReady` never returns true and the splash screen stays up forever. The `try/catch` at `src/features/app/useAppReady.ts:14-18` can't catch a promise that never settles.
   - A corrupt `plan` blob isn't gated at all. `onRehydrateStorage` ignores the error (`src/store/plan.ts:49-50`), and the next `addEntry` overwrites the saved plan.
   - Nothing quarantines the bad blob or logs the failure.
2. **120 AI-generated recipe photos are bundled with no label (QUAL-18).** v1 labelled them. v2 shows a credit only when one exists (`src/features/recipe/RecipeScreen.tsx:125`), so these 120 now look like real photography. No decision about them is recorded.
3. **The P8 plan says "restore Supabase" (`docs/V1-PARITY-PLAN.md:101`) with no step to purge v1's seeded accounts (SEC-5).**
   - The seed created 10 pre-confirmed accounts with a known dictionary password, plus seeded posts.
   - Restoring that project as-is brings them back.
4. **There's one error boundary for the whole app (ARCH-10 / PERF-19),** at `src/app/_layout.tsx:16-22`, and no logger. A crash in any screen replaces the whole app, and nothing records it.
5. **The OTA runtime policy is still `appVersion` (ARCH-5 / PERF-10).** See `app.json:55-57`, together with `eas.json:4,29` (remote versions, `autoIncrement`). Native modules use caret ranges. It's the same trap as v1 and a one-line fix today.
6. **The rule 10 test standard isn't met yet (QUAL-30).**
   - There are 4 component tests (EmptyState, Badge, Stepper, DrawerRow) and no screen is rendered in any test.
   - There's no `maestro/` folder.
   - About 70 controls in features have no testID.

---

## architecture.md (23)

| ID | Title | Status | Evidence | Fix if open |
|---|---|---|---|---|
| ARCH-1 | No navigation library; always-mounted modals | PREVENTED | Expo Router file routes in `src/app/**` with `experiments.typedRoutes` (`app.json:52-54`). The drawer is a route (`src/app/menu.tsx`, `src/features/shell/DrawerScreen.tsx:1-3`). Routes carry ids only (`recipe/[id]`, `collections/[id]`). `ModalSheet` renders nothing while closed (`src/ui/patterns/ModalSheet.tsx:1-3`). A `+not-found` route exists. | |
| ARCH-2 | God-hook store, prop-drilled | PREVENTED | Ten Zustand slices in `src/store/*.ts`, read one value per selector (e.g. `src/features/cupboard/CupboardScreen.tsx:35-40`). Lint bans selector-less store hooks (`eslint.config.js:19-22`). | |
| ARCH-3 | No server-state layer | GUARDED BY PLAN | Rule 3 (TanStack Query, typed API per resource, realtime, timeouts). No server code exists yet. | |
| ARCH-4 | Three sources of "signed in"; deletion can skip the server | OPEN IN V2 *(plan gap)* | P8 lists sign-in and profiles. No rule covers a single session source or gating account actions on the session. | Add to P8: one auth store fed by `onAuthStateChange`, profile from `useMe()`, delete gated on `session`. |
| ARCH-5 | runtimeVersion tied to a static appVersion | OPEN IN V2 | `app.json:55-57` `policy: "appVersion"` with `eas.json:4` `appVersionSource: remote` and `:29` `autoIncrement`. Caret ranges on native modules: `package.json:39` async-storage, `:60` reanimated, `:64` worklets. Rule 11 plans fingerprinting, but the config is wrong now. | Set `"runtimeVersion": {"policy":"fingerprint"}` and pin native modules with `~` or exact versions. |
| ARCH-6 | A failed hydration overwrites saved data | OPEN IN V2 | Zustand v5 `persist` `.catch` leaves `hasHydrated` false. `preferences.ts:109-117` and `oldAppImport.ts:48` then wait forever, and `useAppReady.ts:12-19` never becomes ready, so the splash never hides. `plan.ts:49-50` ignores the error, and the next write overwrites the stored plan. `storage.ts:8` has no backup or quarantine. | Wrap `persistentStorage`: on a read or parse error, copy the raw value to `<key>/corrupt-<ts>`, block writes for that key, log it and show a recovery message. Give the startup gate a timeout. Add a test with a corrupt blob per store. |
| ARCH-7 | Fake data in production; silent simulated fallback | PREVENTED | There's no simulated backend or data in `src`. D-027 hides the inbox and People until P9. `BrowseSections.tsx:4-5` holds back Trending. Rule 4 covers the future. | |
| ARCH-8 | Untyped, hand-mapped API layer | GUARDED BY PLAN | Rule 3 (typed API module per resource) and P8. | |
| ARCH-9 | Sign-out and delete teardown scattered and incomplete | OPEN IN V2 *(plan gap)* | No plan rule covers teardown order (push token, RevenueCat, signOut, query cache, stores). v2 also has no "erase my data" today. Every key does share `STORAGE_PREFIX` (`storage.ts:6`), which makes a full wipe easy to write. | Add one awaited `session.signOut()/deleteAccount()` use-case to P8, with an integration test. |
| ARCH-10 | One root boundary, raw error text, swallowed errors | OPEN IN V2 | The only boundary is `src/app/_layout.tsx:16-22`, so a render error in any route replaces the whole app. Raw text is fixed (`RootErrorScreen.tsx`). There's no logger module, and `useAppReady.ts:16` swallows import failures silently. | Export `ErrorBoundary` from `(tabs)/_layout.tsx` and from the recipe, plan and my-recipe route groups. Add `src/lib/logger.ts` (Sentry-ready) and log in every `catch`. |
| ARCH-11 | Local and server "saved" models duplicated | OPEN IN V2 *(plan gap)* | Recipe Cookmarks are local (`src/store/saved.ts`). D-026 and P9 add server "saves" for posts. The plan doesn't say whether recipe saves sync, or how the two are named. | Record a per-entity decision (local, or synced as one `saves` model) before P8. |
| ARCH-12 | Five ad-hoc AsyncStorage mechanisms, no versioning | PREVENTED | One adapter (`src/store/storage.ts:6-8`). Every persisted slice has its own key and a `version` (e.g. `cookLog.ts:26`, `preferences.ts:80`). Note: the cook log is uncapped (`cookLog.ts:21`). | |
| ARCH-13 | Monolith screens, no module boundaries | PREVENTED | `max-lines` 300 (`eslint.config.js:63`). Features never import features (`:49-58`). The domain is pure (`:36-41`) and routes are thin (`:43-47`). The largest file is 288 lines (`src/data/catalogue/images.ts`). `@/*` alias in tsconfig. | |
| ARCH-14 | Content as code (14k-line recipes.ts) | PREVENTED | JSON catalogue built by `scripts/convert-old-recipes.mts` (D-014). Eager loading is tracked under PERF-21. | |
| ARCH-15 | Config read ad hoc from process.env | GUARDED BY PLAN | Rule 4 (a missing server setting fails the build loudly). The only env read today is `src/data/catalogue/catalogue.ts:11`. | |
| ARCH-16 | Observability half-wired | GUARDED BY PLAN | Rule 11 and P11 (Sentry, source maps, releases). Not installed yet (K-8). | |
| ARCH-17 | Unused native modules; native patch; tooling in deps | OPEN IN V2 | `expo-symbols` is a native dependency with 0 imports (`package.json:54`). Caret native ranges (see ARCH-5). CI has no `expo-doctor` or `expo install --check` (`.github/workflows/ci.yml`). No patches (good). | Remove `expo-symbols`. Pin native versions. Add `npx expo install --check` to CI. |
| ARCH-18 | Backend drift, draft migration in apply path | GUARDED BY PLAN | P8 ("a fresh, audited Supabase schema"). No `supabase/` folder yet. | (Advisory: make CLI timestamped migrations plus CI `db reset` explicit in P8.) |
| ARCH-19 | List rendering items still open | OPEN IN V2 | `src/features/recipes/RecipesScreen.tsx:140` has an inline `renderItem`. `RecipeCard` and `RecipeRow` aren't memoised. `useBookmarks` (`src/store/saved.ts:91-96`) returns new `isSaved` and `toggle` functions every render, so every mounted row re-renders on any bookmark change. | Memoise `RecipeRow` and `RecipeCard`, hoist `renderItem`, and make `isSaved`/`toggle` stable (`useCallback` keyed on bookmarks). |
| ARCH-20 | Orchestration untested; CI not a gate | OPEN IN V2 | CI runs typecheck, lint, format and tests (`ci.yml`). It doesn't run `expo export`, `expo-doctor`, a fingerprint diff or Maestro. The startup gate, hydration and `oldAppImport.ts` merge logic have no tests; only the pure `domain/legacy` has tests. | Add export, doctor and fingerprint steps to CI. Test `importFromOldAppOnce` and the startup gate with mocked AsyncStorage. |
| ARCH-21 | Render-phase side effects, module singletons | PREVENTED | No global mutation during render with identity. The only render-time module write is an idempotent memo keyed on the recipes object (`src/store/recipeBook.ts:14-26`). | |
| ARCH-22 | Repo sprawl; docs disagree | OPEN IN V2 | `docs/KNOWN-ISSUES.md:12` (K-7) mentions the "Today"/"Shop" tabs removed by D-025. K-10 says "Phase 9", which now means Social in the parity plan. `docs/REBUILD-MAP.md` §9 still specifies Newsreader/Manrope, Paper colours and five tabs. | Mark superseded map sections. Renumber KNOWN-ISSUES phases to P1–P11. |
| ARCH-23 | Config nits (tablet, associated domains, indexed access) | OPEN IN V2 | Fixed: `supportsTablet: false` (`app.json:13`) and `noUncheckedIndexedAccess` (`tsconfig.json:5`). Still open: no `associatedDomains`, and no plan item for universal links. Recipe share sends `thepantry://recipe/<id>` (`RecipeScreen.tsx:79`), which people without the app can't open. | Add associated domains and https share links to P9 (they also serve push routing). |

## security.md (25)

| ID | Title | Status | Evidence | Fix if open |
|---|---|---|---|---|
| SEC-1 | Blocking doesn't hide blocked user from blocker | GUARDED BY PLAN | Rule 5 ("blocking works both ways in the database"). Listed there. | |
| SEC-2 | No report or block in DMs; evidence erasable | GUARDED BY PLAN | Rule 6 ("reporting everywhere, messages included"). Listed there. | |
| SEC-3 | Reports go nowhere; placeholder contact | GUARDED BY PLAN | Rule 6 (moderator within 24h, real contact). P9 needs Lachlan's moderation contact. | |
| SEC-4 | Media URLs unconstrained; posts editable after publishing | GUARDED BY PLAN | Rule 5 (media URLs point at our storage; timestamps set by the server). | |
| SEC-5 | Seed accounts with a known password | OPEN IN V2 *(plan gap)* | P8's "restore Supabase" (`docs/V1-PARITY-PLAN.md:101`) has no step to remove the seeded accounts or guard the seed scripts. Rule 4 covers fixtures in the app, not the database. | Before any restore: `select id,email from auth.users where id::text like '11111111-%'`. Delete or rotate those accounts, purge seeded bites, and add a guard so seed scripts refuse the production ref. |
| SEC-6 | DM request folder missing; thread rewritable | GUARDED BY PLAN | Rule 5 (listed SOC-5: participant rewrite, status via RPC). The request policy itself is under SOC-4 (plan gap). | |
| SEC-7 | Comments movable to other posts | GUARDED BY PLAN | Rule 5 (listed). | |
| SEC-8 | DM senders can edit or un-delete messages | GUARDED BY PLAN | Rule 5 (listed). | |
| SEC-9 | Blocked users can still follow; follow spam | GUARDED BY PLAN | Rule 5 (listed). | |
| SEC-10 | Deleted post or comment photos stay public | OPEN IN V2 *(plan gap)* | No plan item for purging storage on post, comment or avatar delete. | Add to rule 5: an after-delete trigger enqueues storage paths, and an edge function purges them. |
| SEC-11 | No Apple token revocation or RevenueCat erasure on delete | OPEN IN V2 *(plan gap)* | P8 and P10 don't mention SIWA revoke, RevenueCat subscriber delete, report retention, `verify_jwt` or recent auth. | Add to the P8 and P10 checklists. |
| SEC-12 | Repo migrations don't reproduce prod grants | GUARDED BY PLAN | P8 ("a fresh, audited schema, row-level security"). | (Advisory: state least-privilege grants explicitly.) |
| SEC-13 | Push tokens survive sign-out and "off" | OPEN IN V2 *(plan gap)* | P9 lists "push" only. No rule on deleting the token on sign-out or toggle-off, or claiming it on register. | Add to P9: delete on sign-out and toggle-off, `claim_push_token`, token unique. |
| SEC-14 | No content filter or impersonation controls | GUARDED BY PLAN | Rule 6 (content filter; listed), and P8 "profiles and handles". | |
| SEC-15 | Prod may ship fabricated social activity | PREVENTED | No simulated backend exists. Rule 4. D-027. | |
| SEC-16 | Unbounded profile and post fields in the DB | OPEN IN V2 *(plan gap)* | Rule 5 doesn't list length limits. | Add DB CHECKs generated from one shared limits module (see SOC-19). |
| SEC-17 | AI proxy cost and information-leak gaps | OPEN IN V2 *(plan gap)* | P10 says only "AI pantry and receipt scanning". No entitlement caching, generic errors or server-built prompts. | Add to P10: `task` enum prompts, entitlement cache, generic errors, restricted CORS. |
| SEC-18 | Google sign-in without nonce; leaked-password protection off | OPEN IN V2 *(plan gap)* | Not in P8. | Add to P8: nonce on Google, HIBP toggle, email confirm, auth rate limits. |
| SEC-19 | Sentry scrubber gaps | GUARDED BY PLAN | Rule 11 ("crash reports… are scrubbed"). | |
| SEC-20 | SECURITY DEFINER with `search_path = public` | GUARDED BY PLAN | Rule 5 ("privileged functions use an empty search path"). | |
| SEC-21 | Draft ranked_feed trusts caller id | GUARDED BY PLAN | Rule 5 (author ids and counts from the server) and rule 12 (paging). No ranking is planned. | |
| SEC-22 | Sign-out leaves local data | OPEN IN V2 *(plan gap)* | Same gap as ARCH-9. No "sign out everywhere" planned. | As ARCH-9, plus a global sign-out option. |
| SEC-23 | Video can't upload; microphone requested | OPEN IN V2 *(plan gap)* | v2 requests no microphone (good). P9 adds "photos and video" and expo-video, but the plan doesn't specify a video bucket, MIME types or size limits. | Specify the video pipeline in P9, or drop video (see SOC-10). |
| SEC-24 | Privacy manifest and policy inaccuracies | OPEN IN V2 | `app.json:18-22` overrides `privacyManifests` with no `NSPrivacyAccessedAPITypes`, the same pattern as v1. P11 lists "the privacy manifest". | Add the required-reason APIs (CA92.1, C617.1, 35F9.1 as applicable) now. |
| SEC-25 | Committed publishable keys | PREVENTED | No keys in `eas.json` or `app.json`. `.env` and `.env.*` are gitignored (`.gitignore:7-9`). | |

## social.md (30)

| ID | Title | Status | Evidence | Fix if open |
|---|---|---|---|---|
| SOC-1 | Blocking one-directional | GUARDED BY PLAN | Rule 5 (listed). | |
| SOC-2 | Fake or demo content can reach users | PREVENTED | No simulated users or posts in `src`. D-027 holds back People and Trending. The seeded-database half is SEC-5. | |
| SOC-3 | DMs not live; 500 cap; unknown authors | GUARDED BY PLAN | Rule 3 (realtime for messages, cursor pagination, foreground refresh). | |
| SOC-4 | Message requests and unread counts dead | OPEN IN V2 *(plan gap)* | The plan has no policy on who lands in Requests, no `accept_thread`, and no unread RPC. It's a product decision. | Ask Lachlan for the request policy. Add `inbox_page` and `accept_thread` to P9. |
| SOC-5 | Participant can rewrite a thread | GUARDED BY PLAN | Rule 5 (listed). | |
| SOC-6 | Follower count double-counted | GUARDED BY PLAN | Rule 5 (counts kept by the DB; listed). | |
| SOC-7 | Profile column grants contradictory | GUARDED BY PLAN | Rule 5 (listed) and P8. | |
| SOC-8 | Like and comment counts fabricated | GUARDED BY PLAN | Rule 5 (listed). Trending is held back (plan "Parts of v1 held back"). | |
| SOC-9 | Feed = newest 200, shuffled | GUARDED BY PLAN | Rules 3 and 12 (listed). | |
| SOC-10 | Video posts fail to upload | OPEN IN V2 *(plan gap)* | P9 promises video. There's no pipeline plan: bucket, transcode, TUS, poster, type from `asset.type`. | Either drop video for launch or write the pipeline into P9. |
| SOC-11 | Multi-photo posts lose photos | OPEN IN V2 *(plan gap)* | No plan item for a transactional `create_bite` or embedded image reads. | Add a `create_bite(payload)` RPC and a `bite_media` embed to P9. |
| SOC-12 | Push never sent; taps don't deep-link | GUARDED BY PLAN | P9 ("push"), rule 1 (every screen a route with a link), and rule 3. Links already resolve through Expo Router (scheme `thepantry`). | |
| SOC-13 | Notifications never marked read, not deduped | OPEN IN V2 *(plan gap)* | Rule 3 gives realtime only. No mark-read, dedupe, server-side type filter or target resolution. | Add `mark_notifications_read`, a dedupe index and no per-DM rows to P9. |
| SOC-14 | Post creation not atomic or idempotent | OPEN IN V2 *(plan gap)* | No client-generated id, upsert paths or orphan sweep in the plan. | Add a client UUID, `on conflict do nothing`, upsert storage paths and a nightly orphan sweep to P9. |
| SOC-15 | DM history editable or destroyable | GUARDED BY PLAN | Covered through the listed SEC-2 (rule 6) and SEC-8 (rule 5). | |
| SOC-16 | Clients set timestamps; comments movable | GUARDED BY PLAN | Rule 5 (listed). | |
| SOC-17 | Toggles not idempotent, race, fail silently | GUARDED BY PLAN | Rule 3 (optimistic updates that roll back). | |
| SOC-18 | Feed and post error or empty states are dead ends | GUARDED BY PLAN | Rule 3. The `ErrorState` with Try again and `EmptyState` with an action already exist (`src/ui/patterns/ErrorState.tsx`, `EmptyState.tsx`). | |
| SOC-19 | Input limits disagree with the DB; failed DM loses draft | OPEN IN V2 *(plan gap)* | No shared limits module in the plan. Client limits today are literals (e.g. `SavedLists.tsx` `maxLength={40}`, `ShoppingListView.tsx` `maxLength={60}`). | Add a limits module in `src/domain` that drives both `maxLength` and the SQL CHECKs. Keep drafts until a send succeeds. |
| SOC-20 | Thread opens at oldest; N+1 inbox | GUARDED BY PLAN | Rules 12 and 3. | |
| SOC-21 | Follower lists unbounded | GUARDED BY PLAN | Rule 3 (cursor pagination). | |
| SOC-22 | Deletes silently no-op; files left | OPEN IN V2 *(plan gap)* | Not in the plan (see SEC-10). | Use `.delete().select('id')` and throw when nothing was deleted. Add a storage purge trigger. |
| SOC-23 | Handle rules too loose | GUARDED BY PLAN | Rule 6 (SEC-14 impersonation controls) and P8 "handles". | |
| SOC-24 | Reporting brittle, no moderation loop | GUARDED BY PLAN | Rule 6 (listed). | |
| SOC-25 | No cache, no offline awareness, raw errors | GUARDED BY PLAN | Rule 3 (listed) and rule 11 (no raw errors). | |
| SOC-26 | Double re-encode, no renditions | GUARDED BY PLAN | Rule 12 ("media is sized"). | |
| SOC-27 | Comments capped at the oldest 500 | GUARDED BY PLAN | Rule 12 (listed). | |
| SOC-28 | Draft ranked feed wrong | GUARDED BY PLAN | Rule 5 (counts by the DB) and rule 12. No ranking planned. | |
| SOC-29 | Account delete erases the other side's conversation | OPEN IN V2 *(plan gap)* | Not in the plan. | Tombstone the profile or null the participant, and keep the messages for the other person. |
| SOC-30 | Docs drift; loose search filter | OPEN IN V2 *(plan gap)* | No `search_profiles` RPC, escaping or trigram index in the plan. | Add a `search_profiles(q)` RPC with `pg_trgm` to P9. |

## performance.md (29)

| ID | Title | Status | Evidence | Fix if open |
|---|---|---|---|---|
| PERF-1 | Every state change re-renders the whole app | PREVENTED | Routes mount only when navigated to. Stores are read one value per selector, and lint enforces it (`eslint.config.js:19-22`). | |
| PERF-2 | Hidden screens fire about 15 requests at startup | PREVENTED | No hidden screens. The only network call is Import from a link, on demand (`ImportLinkScreen.tsx:24-34`). | |
| PERF-3 | Onboarding video loops forever | PREVENTED | The welcome is text only (`src/features/welcome/WelcomeScreen.tsx`). No video dependency. | |
| PERF-4 | Feed videos play off-screen | GUARDED BY PLAN | Rule 12 (listed). No video yet. | |
| PERF-5 | Unmemoised feed grid | OPEN IN V2 | The same pattern in Browse: `RecipesScreen.tsx:140` inline `renderItem`, unmemoised `RecipeCard`, unstable `useBookmarks` (`saved.ts:91-96`). | As ARCH-19. |
| PERF-6 | Corrupt or oversized state wipes data | OPEN IN V2 | See ARCH-6 (the splash hangs, or the plan is overwritten). | As ARCH-6. |
| PERF-7 | Hydration race overwrites early writes | OPEN IN V2 | The startup gate waits for six stores (`oldAppImport.ts:48`) but not `usePlan`. A plan write before it hydrates is lost to the default merge, and Feed can flash "no dinner" first. Entitlement isn't persisted (good). | Gate on every persisted store via one `allHydrated()` exported from `storage.ts`. |
| PERF-8 | Source maps never uploaded | GUARDED BY PLAN | Rule 11 (listed). | |
| PERF-9 | Cook timers jump steps and stall when locked | PREVENTED | Absolute `endsAt` (`src/domain/cook/timers.ts:4-12`). A local notification at `endsAt` (`useCookTimers.ts:39-45`). Timers sit in a bar that survives step changes (`TimerBar.tsx`). Keyed by id, not segment. Residual (not the audit bug): tapping a time twice starts two timers, and leaving Cook Mode cancels running timers without a warning. | |
| PERF-10 | OTA can crash installed apps | OPEN IN V2 | Same config as ARCH-5 (`app.json:55-57`). | As ARCH-5. |
| PERF-11 | Video upload loads the file into JS memory | OPEN IN V2 *(plan gap)* | Video pipeline not specified (see SOC-10). | As SOC-10. |
| PERF-12 | Feed is a three-request waterfall | GUARDED BY PLAN | Rule 3 (typed API, cursor pagination). | |
| PERF-13 | DM threads: 500 oldest, N+1 | GUARDED BY PLAN | Rules 3 and 12. | |
| PERF-14 | No cache, timeouts or foreground refresh | GUARDED BY PLAN | Rule 3 (listed). The one fetch today has a 15 s timeout (`ImportLinkScreen.tsx:15,26`). | |
| PERF-15 | Crash opt-out leaks; PII scrub gaps | GUARDED BY PLAN | Rule 11 ("scrubbed"). | (Advisory: add "read the opt-out before `Sentry.init`" to rule 11.) |
| PERF-16 | Screen tracing is dead code | GUARDED BY PLAN | P11 (Sentry). Expo Router makes a navigation integration possible. | |
| PERF-17 | Unbounded lists inside ScrollViews | OPEN IN V2 | Every saved recipe renders as a card with an image inside `Screen`'s ScrollView: `SavedLists.tsx:36` (Cookmarks, Kitchen stats), `CollectionScreen.tsx:97`, `AddToPlanSheet.tsx:69` (all saved recipes, uncapped). Also the whole shopping list (`ShoppingListView.tsx:75-78`) and the cupboard (`CupboardScreen.tsx:105`). With a 285-recipe catalogue a heavy user can hit 100+ image cards. | Use `FlatList`/`SectionList` (the shopping list by aisle), or cap the saved list in the sheet with "See all". |
| PERF-18 | Whole state serialised on every change | PREVENTED | Per-slice keys with `partialize` (e.g. `saved.ts:85`). Each write covers only its slice. | |
| PERF-19 | One boundary; raw error text | OPEN IN V2 | Raw text is fixed (`RootErrorScreen.tsx`), but there's still one root boundary (`_layout.tsx:16-22`). | As ARCH-10. |
| PERF-20 | Remote images full-size, no placeholder | GUARDED BY PLAN | Rule 12 (listed). Today's images are bundled, with `transition={200}` (`RecipeImage.tsx:45`). | |
| PERF-21 | Bundled asset weight; eager data imports | OPEN IN V2 | `assets/recipes/` holds 285 JPEGs at 900×1200, **40 MB** (`du`). They ship even though release builds show only vetted recipes (currently 0). `recipes.json` (1.5 MB) and `ingredients.json` are imported and indexed at module load (`catalogue.ts:6-7,29`). | Re-encode to about 800 px WebP (roughly 20 MB). Bundle images only for vetted recipes in release. Build the indexes lazily. Measure with `expo export --dump-assetmap`. |
| PERF-22 | Blank screen after splash; theme flash | PREVENTED | `SplashScreen.preventAutoHideAsync()` (`_layout.tsx:14`), then hide once fonts and preferences are ready (`:25-29`, `useAppReady.ts`). | |
| PERF-23 | Unhandled promise rejections | OPEN IN V2 | `useCookTimers.ts:43` awaits `ensureNotificationPermission()` (`src/lib/notifications.ts:16-23`), which has no `try`. The caller is `void start(...)` (`CookScreen.tsx:118`), so a permission API failure becomes an unhandled rejection. | Wrap `ensureNotificationPermission` in `try/catch` and return false. |
| PERF-24 | Side effect inside render | PREVENTED | None found. The `recipeBook.ts` memo is idempotent. | |
| PERF-25 | Recipe comments fetched twice | GUARDED BY PLAN | Rule 3 (shared query keys). Comments held back to P9. | |
| PERF-26 | Missing env silently falls back to simulated feed | PREVENTED | No simulated API exists. Rule 4. | |
| PERF-27 | Patch tied to an exact expo-video version | PREVENTED | No `patches/` folder and no patch-package. | |
| PERF-28 | Orphaned uploads; double encode | OPEN IN V2 *(plan gap)* | See SOC-14. | As SOC-14. |
| PERF-29 | Older feed response overwrites newer | GUARDED BY PLAN | Rule 3 (listed). | |

## quality.md (34)

| ID | Title | Status | Evidence | Fix if open |
|---|---|---|---|---|
| QUAL-1 | Fake data in production | PREVENTED | No simulated data. D-027. Rule 4. | |
| QUAL-2 | God-files | PREVENTED | `max-lines` 300 in lint. Shared `SectionHeader`, `EmptyState`, `RecipeCard` in `src/ui/patterns`. | |
| QUAL-3 | No navigation library | PREVENTED | Expo Router (see ARCH-1). | |
| QUAL-4 | Two grocery pipelines | PREVENTED | One pipeline: `src/domain/shopping/derive.ts`, tested in `derive.test.ts`, used by `features/plan/useWeekList.ts:25`. | |
| QUAL-5 | Dead code | OPEN IN V2 | Small, but nothing guards it: unused `expo-symbols` (`package.json:54`), unused `target` style (`src/ui/primitives/Chip.tsx:59`). No knip or ts-prune in CI. | Add `knip` to CI and remove both. |
| QUAL-6 | tsconfig strict only | PREVENTED | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `noFallthroughCasesInSwitch` (`tsconfig.json:4-8`). (`noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns` are still off: minor.) | |
| QUAL-7 | `any` escapes; persisted state unvalidated | OPEN IN V2 | `any` is banned (`eslint.config.js:62`). But persisted state is still spread unchecked: `preferences.ts:94-103` (`as unknown as PreferencesState`), and the other slices use Zustand's default shallow merge with no guard. REBUILD-MAP §8 promised "persisted state versioned and checked on load". | Add a hand-written guard per slice in `src/domain`, used in `migrate`/`merge`. Invalid saves go to the ARCH-6 quarantine. |
| QUAL-8 | Copy-pasted helpers | PREVENTED | `capitalise` lives once in `domain/shopping/derive.ts`. Avatar and initials in one `Avatar` primitive. | |
| QUAL-9 | Legacy naming | OPEN IN V2 | Code and UI names diverge again: store `saved`/`bookmarks` and route `/saved`, but the UI says "Cookmarks" (`DrawerScreen.tsx:76`). Route `/surprise` and `SurpriseScreen`, but the drawer says "Spinner" (`:89`). The "Feed" tab renders Tonight, and NotFound says "Go to Today" (`NotFoundScreen.tsx:14`). | Record a glossary in DECISIONS mapping each v1 label to one code noun, and fix "Go to Today". |
| QUAL-10 | Comments as changelog | OPEN IN V2 | Roadmap and history comments that will go stale: `RecipeScreen.tsx:3` ("v2 used to pin…"), `CupboardScreen.tsx:2` ("P5 rebuilds it…"), `SettingsScreen.tsx:2`, `LibraryScreens.tsx:2`. No TODOs or commented-out code (good). | Move phase notes to the plan and keep "why" comments only. |
| QUAL-11 | Logging hygiene (keep the logger) | OPEN IN V2 | v2 has no logger at all. Every `catch` is silent (e.g. `useAppReady.ts:16`, `notifications.ts`). | Add `src/lib/logger.ts` (see ARCH-10). |
| QUAL-12 | Tokens cover colour only; size literals everywhere | OPEN IN V2 | Tokens exist (`src/ui/tokens/type.ts`), but lint bans only colour literals. About 45 spacing and size literals remain, e.g. `CookScreen.tsx:106,115` (`fontSize: 30, lineHeight: 42`), `RecipeHeader.tsx:182-217` (6, 14, 5, 10), `RecipeBody.tsx:151-172` (7, 3, 5, 6, 2), `RecipesScreen.tsx:155-165` (`SPACE.xs + 2`, 7), `WelcomeScreen.tsx:67` (`minHeight: 44`), `Toast.tsx:54` (`+ 90`). CLAUDE.md forbids these. | Add a lint rule banning numeric literals on style props outside `src/ui/tokens` (allow 0, 1 and hairline). Move the values into tokens (e.g. a `cookStep` type token). |
| QUAL-13 | Hex and rgba literals outside the theme | PREVENTED | Lint (`eslint.config.js:9-17`). A grep finds no hex or rgb outside `src/ui/tokens`. Dark tints are separate values (`colour.ts`). | |
| QUAL-14 | Two cuisine colour systems | PREVENTED | One module, `src/ui/tokens/cuisine.ts` (eyebrow plus tint per family). Greens allowed by D-025. | |
| QUAL-15 | Emoji and glyphs as icons | PREVENTED | One icon set via `src/ui/primitives/Icon.tsx` (Ionicons). A code-point scan of `src` finds glyphs only in comments and in a parser regex (`draft.ts:47`). | |
| QUAL-16 | Gradients and shadows everywhere | NOT APPLICABLE | v2 deliberately reproduces v1's look (D-025). Scrims and shadows are tokens (`colour.ts` `GRADIENTS`, `type.ts` `SHADOW`), so the redesign changes tokens only. | |
| QUAL-17 | Components rebuilt per screen | PREVENTED | Primitives: Button, IconButton, Chip, Sheet, ModalSheet/ActionSheet, ListRow, SectionHeader, EmptyState, ErrorState, Toast. No `Alert.alert` anywhere. (Some raw `Pressable` remains in feature chrome, e.g. `RecipeHeader.tsx`, `TabBar.tsx`: minor.) | |
| QUAL-18 | AI-generated photos | OPEN IN V2 | 120 of the 285 images in `assets/recipes/` are v1's AI-generated ones. They're the 120 recipes with no `image.credit` in `recipes.json`; v1's `recipeImageCredits.json` lists 120 as `ai-generated`. v2 shows them **without** v1's "AI-generated photo" label (`RecipeScreen.tsx:125` renders a credit only when present). No decision is recorded. | Ask Lachlan. Recommend using the tinted no-photo card (`RecipeImage.tsx` fallback) for those 120 until real photos exist, and recording it in DECISIONS. |
| QUAL-19 | Pressables lack role and label | PREVENTED | `label` is required in the prop types (Button, IconButton, Chip, Checkbox). Every `Pressable` in `src` has `accessibilityRole` and `accessibilityLabel` (checked with a script). Headers use role `header`. Chips announce checked state (`Chip.tsx:29-30`). | |
| QUAL-20 | Text/background pairs fail AA | OPEN IN V2 | There's a contrast test with a shrinking known-failures list (`tokens.test.ts:26-39`), per plan rule 9. But its `WATCHED` pairs leave out the cuisine eyebrow inks, which are text at 9.5–10.5 pt: `#B88E47` is 3.0:1 and `#3D9E82` is 3.3:1 on white (`cuisine.ts:17-21`). They also leave out `inkSubtle` used as text (`RecipeBody.tsx:64`, 1.9:1). So the redesign list is incomplete. | Add the eyebrow colours on `bg`/`card` and `inkSubtle` on `bg` to `WATCHED`/`KNOWN_FAILURES`. |
| QUAL-21 | No Dynamic Type strategy; 9 pt text | OPEN IN V2 | Scaling is capped (`Text.tsx:34`, good). But 9–10 pt tokens remain (`type.ts:67-68,89,91`: `pill` 9, `eyebrow` 9.5, `kickerSmall` and `infoLabel` 10). `SearchField` has fixed `height: 46` on its container and input (`SearchField.tsx:54,64`), so it clips at large sizes. | Use `minHeight` on SearchField. List the sub-11 pt tokens for the redesign alongside contrast. |
| QUAL-22 | Touch targets under 44 pt | PREVENTED | `TAP_TARGET` 44 in IconButton (`:55`), Button and Checkbox. Chip is 40 plus 8 hitSlop. (Cook Mode buttons are 44, not the 56 the audit suggested: minor.) | |
| QUAL-23 | Reduce Motion ignored | PREVENTED | `useReducedMotion` in `CookScreen.tsx`, `SurpriseScreen.tsx` and `Skeleton.tsx`. Reanimated `withTiming` and layout animations default to `ReduceMotion.System` (drawer, tab bar, toast). `MOTION` tokens. (Minor: RN `Modal animationType="slide"` in `ModalSheet.tsx` doesn't follow the setting.) | |
| QUAL-24 | Screen-reader order and semantics | PREVENTED | `accessibilityViewIsModal` on the drawer (`DrawerScreen.tsx:48`) and sheets (`ModalSheet.tsx:27`). Toasts announced (`Toast.tsx:28`). Real routes. | |
| QUAL-25 | The same things have 3–4 names | OPEN IN V2 | "Cookmarks" (`DrawerScreen.tsx:76`, toasts at `RecipeScreen.tsx:106`) vs "Saved" and "Save" (kicker "Saved", `SavedLists.tsx:59-60` "Nothing saved yet… Tap Save"). "Spinner" (`DrawerScreen.tsx:89`) vs "Surprise me". "Feed" vs "Today" (`NotFoundScreen.tsx:14`). The plan adopts v1's labels with no glossary rule. | Pick one user-facing word per concept, even if it's v1's (e.g. "Cookmarks" everywhere, including the Save button and kicker). Add a copy test for banned synonyms. |
| QUAL-26 | American spelling | OPEN IN V2 | UI copy and dates are AU (`src/lib/dates.ts`, tested). But recipe content in `src/data/catalogue/recipes.json` uses "yogurt" about 75 times. | Fix through `scripts/data/recipe-fixes.json` (D-014), plus a spelling check in `catalogue:convert`. |
| QUAL-27 | Raw technical errors; dead "Forgot password" | PREVENTED | Mapped messages (`ImportLinkScreen.tsx:18-22`). The boundary copy is friendly (`RootErrorScreen.tsx`). No `.message` reaches the UI. No sign-in yet. | |
| QUAL-28 | Tone and punctuation | OPEN IN V2 | Straight and curly apostrophes are mixed in UI copy. Straight: `RecipeScreen.tsx:63,82`, `NotFoundScreen.tsx:12`, `RootErrorScreen.tsx:17`, `ShoppingListView.tsx:54`, `RecipesScreen.tsx:108`. About 28 other strings use curly. | Add a lint or test for `'` in JSX text and string literals shown to users. |
| QUAL-29 | Empty states inconsistent | PREVENTED | One `EmptyState` (title, body, one action) used across Saved, Plan, Cupboard, Recipe, Collection and NotFound. | |
| QUAL-30 | Zero UI tests; no testIDs; no Maestro | OPEN IN V2 | 4 component tests (EmptyState, Badge, Stepper, DrawerRow). No screen rendered in any test. No `maestro/` folder (the map §8 lists one). About 70 feature controls have no testID, e.g. every Cook Mode control (`CookScreen.tsx:80-141`), the shopping-list rows (`ShoppingListView.tsx`), `CollectionScreen.tsx`, `WelcomeScreen.tsx`. Checkbox has no `testID` prop. | Add `testID` to Checkbox, Switch and Toast Undo. Give every control a `screen.element` id. Add one RNTL render test per screen state, and `maestro/` flows for plan → shop → cook. |
| QUAL-31 | Store transitions and migration untested | OPEN IN V2 | Store transitions are inline in the stores and untested: `saved.ts` toggles and collections, `plan.ts` add/move/restore and pruning, `cupboard.ts`, `myRecipes.ts`. So are `preferences.ts:94-103` migrate and the `oldAppImport.ts` merge. Only `src/domain` has tests. | Move transitions into `src/domain` reducers with node:test. Add migration tests from fixture JSON per store version. |
| QUAL-32 | Social, purchases, auth, push untested | GUARDED BY PLAN | Rule 10 (listed). None of that code exists yet. | |
| QUAL-33 | Tests pinned to implementation | PREVENTED | The token test asserts contrast invariants, not hex values (`tokens.test.ts`). Domain tests are behavioural. | |
| QUAL-34 | Lint doesn't enforce structure | OPEN IN V2 | Enforced now: max-lines, no-any, boundaries, colour literals. Not enforced: size and spacing literals (QUAL-12), emoji, accessibility props, raw `Pressable` in features, curly quotes. | Add those rules (see QUAL-12, QUAL-28). |

---

## OPEN IN V2, ranked

### A. Problems in v2's code or config today (32)

| # | ID | Severity | Problem | Where | Fix |
|---|---|---|---|---|---|
| 1 | ARCH-6 / PERF-6 | Critical | A corrupt or unreadable store hangs the splash forever, or the next write overwrites the plan | `src/store/preferences.ts:109-117`, `src/store/oldAppImport.ts:48`, `src/features/app/useAppReady.ts:12-19`, `src/store/plan.ts:49-50`, `src/store/storage.ts:8` | Quarantine the raw blob on read or parse failure, block writes, time-box the startup gate, log it, add corrupt-blob tests |
| 2 | QUAL-18 | High | 120 AI-generated photos bundled and shown with no label | `assets/recipes/`, `src/features/recipe/RecipeScreen.tsx:125` | Decision from Lachlan; show the tinted fallback for AI images until real photos exist |
| 3 | QUAL-30 | High | 4 component tests, no screen tests, no Maestro, about 70 controls without a testID | `src/**/*.test.tsx`, `CookScreen.tsx:80-141`, `ShoppingListView.tsx` | testIDs on every control, a render test per screen state, `maestro/` journeys |
| 4 | ARCH-10 / PERF-19 | High | One root error boundary; no logger; silent catches | `src/app/_layout.tsx:16-22`, `useAppReady.ts:16` | `ErrorBoundary` per route group, `src/lib/logger.ts` |
| 5 | ARCH-5 / PERF-10 | Medium | runtimeVersion `appVersion` with remote autoIncrement; caret native deps | `app.json:55-57`, `eas.json:4,29`, `package.json:39,60,64` | `policy: "fingerprint"`, pin native modules |
| 6 | PERF-17 | Medium | Unbounded saved-recipe and shopping lists rendered in ScrollViews | `SavedLists.tsx:36`, `CollectionScreen.tsx:97`, `AddToPlanSheet.tsx:69`, `ShoppingListView.tsx:75-78`, `CupboardScreen.tsx:105` | FlatList or SectionList, or cap with "See all" |
| 7 | PERF-21 | Medium | 40 MB of 900×1200 JPEGs bundled for 285 recipes (0 vetted); 1.5 MB JSON parsed at startup | `assets/recipes/`, `src/data/catalogue/catalogue.ts:6-7,29` | WebP about 800 px, vetted-only images in release, lazy index |
| 8 | QUAL-12 | Medium | About 45 spacing and size literals in screens; lint checks colours only | `CookScreen.tsx:106,115`, `RecipeHeader.tsx:182-217`, `RecipeBody.tsx:151-172`, `RecipesScreen.tsx:155-165` | Numeric-style lint rule; move values into tokens |
| 9 | QUAL-31 | Medium | Store transitions, migrate and the old-app merge untested | `src/store/saved.ts`, `plan.ts`, `preferences.ts:94-103`, `oldAppImport.ts` | Domain reducers with node:test; migration fixtures |
| 10 | ARCH-20 | Medium | CI lacks export, doctor, fingerprint and Maestro; startup orchestration untested | `.github/workflows/ci.yml` | Add those steps and startup-gate tests |
| 11 | QUAL-25 | Medium | "Cookmarks", "Saved" and "Save"; "Spinner" and "Surprise me"; "Feed" and "Today" | `DrawerScreen.tsx:76,89`, `RecipeScreen.tsx:106`, `SavedLists.tsx:59-60`, `NotFoundScreen.tsx:14` | Glossary decision plus a copy test |
| 12 | QUAL-7 | Medium | Persisted state spread unchecked | `src/store/preferences.ts:94-103` | Hand-written guards in migrate and merge |
| 13 | PERF-7 | Low | Plan store not in the startup hydration gate | `src/store/oldAppImport.ts:48` | One `allHydrated()` over every persisted store |
| 14 | QUAL-20 | Low | Contrast watch-list omits cuisine eyebrows (3.0–3.4:1) and `inkSubtle` text | `src/ui/tokens/tokens.test.ts:33-39`, `cuisine.ts:17-21`, `RecipeBody.tsx:64` | Add them to `WATCHED`/`KNOWN_FAILURES` |
| 15 | QUAL-21 | Low | 9–10 pt type tokens; fixed-height search field clips at large text | `src/ui/tokens/type.ts:67-68,89,91`, `SearchField.tsx:54,64` | `minHeight`; list the tokens for the redesign |
| 16 | ARCH-19 / PERF-5 | Low | Browse grid: inline `renderItem`, unmemoised cards, unstable `useBookmarks` | `RecipesScreen.tsx:140`, `src/store/saved.ts:91-96` | Memoise, stabilise callbacks |
| 17 | PERF-23 | Low | Timer start can raise an unhandled rejection | `src/features/cook/useCookTimers.ts:43`, `src/lib/notifications.ts:16-23` | `try/catch`, return false |
| 18 | SEC-24 | Low | Privacy manifest override without required-reason APIs | `app.json:18-22` | Add `NSPrivacyAccessedAPITypes` |
| 19 | ARCH-23 | Low | No associated domains; share uses a custom-scheme link non-users can't open | `app.json`, `RecipeScreen.tsx:79` | Universal links and https share URLs in P9 |
| 20 | ARCH-17 | Low | Unused native `expo-symbols`; no `expo install --check` in CI | `package.json:54`, `ci.yml` | Remove it; add the check |
| 21 | QUAL-34 | Low | Lint misses size literals, emoji, accessibility props, raw Pressable, quotes | `eslint.config.js` | Add rules |
| 22 | QUAL-26 | Low | "yogurt" about 75× in recipe content | `src/data/catalogue/recipes.json` | `recipe-fixes.json` plus a spelling check |
| 23 | QUAL-9 | Low | Code and UI nouns diverge (saved/bookmarks vs Cookmarks; surprise vs Spinner) | `DrawerScreen.tsx:76,89` | Glossary in DECISIONS |
| 24 | QUAL-28 | Low | Mixed straight and curly apostrophes in UI copy | `RecipeScreen.tsx:63,82`, `NotFoundScreen.tsx:12`, `RootErrorScreen.tsx:17`, `ShoppingListView.tsx:54`, `RecipesScreen.tsx:108` | Lint or test |
| 25 | QUAL-11 | Low | No logger module at all | `src/lib/` | Add `logger.ts` (with ARCH-10) |
| 26 | QUAL-10 | Low | Phase and history notes in code comments | `RecipeScreen.tsx:3`, `CupboardScreen.tsx:2`, `SettingsScreen.tsx:2`, `LibraryScreens.tsx:2` | Move them to docs |
| 27 | QUAL-5 | Low | Small dead code, no knip | `Chip.tsx:59`, `package.json:54` | knip in CI |
| 28 | ARCH-22 | Low | Docs contradict the current plan (old tabs, "Phase 9", old fonts) | `docs/KNOWN-ISSUES.md:12,14`, `docs/REBUILD-MAP.md` §9 | Mark superseded; renumber |

(Rows 1, 4, 5 and 16 each cover two audit ids, so these 28 rows are 32 findings.)

### B. Plan gaps: not built yet, and no rule or phase covers the mechanism (23)

| # | ID | Severity | Gap | Add to the plan |
|---|---|---|---|---|
| 1 | SEC-5 | High | P8 "restore Supabase" with v1's known-password seed accounts still possibly present | A pre-restore purge or rotate step, and a seed guard against the production ref |
| 2 | SEC-11 | High | No SIWA revocation, RevenueCat erasure or report retention on delete | P8 and P10 checklist |
| 3 | ARCH-4 | High | No single session source; delete not gated on session | Rule 3 or P8: one auth store |
| 4 | SOC-4 | High | Message-request policy and unread counts undecided | A product decision; `inbox_page` and `accept_thread` |
| 5 | SOC-13 | High | Notifications: mark-read, dedupe, block-aware, target resolution | P9 |
| 6 | SOC-10 / PERF-11 / SEC-23 | High | Video promised in P9 with no pipeline (bucket, transcode, TUS, poster) | Specify it, or drop video for launch |
| 7 | SOC-11 | High | Transactional multi-photo create and embedded reads | A `create_bite` RPC |
| 8 | ARCH-9 / SEC-22 | Medium | Sign-out and delete teardown order; local wipe | One awaited use-case plus a test |
| 9 | SEC-13 | Medium | Push tokens not removed on sign-out or toggle-off | P9 |
| 10 | SOC-14 / PERF-28 | Medium | Idempotent post create; orphan cleanup | Client UUIDs, upsert paths, sweep |
| 11 | SEC-10 / SOC-22 | Medium | Storage purge on delete; zero-row deletes reported as success | Trigger plus edge function; `.select('id')` check |
| 12 | ARCH-11 | Medium | Recipe saves (local) vs post saves (server) | A per-entity decision |
| 13 | SOC-19 / SEC-16 | Medium | Client and DB limits diverge; failed sends lose drafts | A shared limits module that generates the CHECKs |
| 14 | SOC-29 | Low | Account delete wipes the other person's DMs | Tombstone the profile |
| 15 | SOC-30 | Low | Search escaping and trigram index | `search_profiles` RPC |
| 16 | SEC-17 | Low | AI proxy hardening | P10 |
| 17 | SEC-18 | Low | Google nonce; leaked-password protection | P8 |

(Rows 6, 8, 10, 11 and 13 each cover several audit ids, so these 17 rows are 23 findings.)
