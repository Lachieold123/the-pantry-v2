# The Pantry (old app): architecture audit

Scope: architecture, navigation, state, data flow, module boundaries, persistence, error handling, config/build, dependency hygiene.
Source: `/home/claude/old-audit` (read-only). Baseline as given: `tsc` passes, eslint has 3 errors, jest 36 suites / 323 tests pass.
Every finding below was checked against the code, not the docs. Line numbers refer to the copy under audit.

Severity counts: Critical 3 · High 6 · Medium 11 · Low 3 (23 findings)

---

### ARCH-1 · No navigation library: ~32 always-mounted Modals driven by a hand-rolled stack, with real stack bugs
- Severity: Critical
- Where: src/screens/HomeScreen.tsx:64-99 (Route union), :178-229 (push/pop), :345, :375 (`has`), :497-530 and :548-575 (`[0,1,2].map`), :577-583 (ThreadModal), :415-426 (the "matte" overlay); App.tsx:59-61
- What's wrong: The whole app is `<HomeScreen>` rendering 32 `visible=` modal instances (`grep -c "visible=" HomeScreen.tsx` = 32) that stay mounted all the time. "Navigation" is an array of `NavEntry` in `useState`. There's no router, no `Linking` listener, and no handler for notification taps (`grep` finds no `addNotificationResponseReceivedListener`, `getInitialURL` or `useURL`; `Linking` is only used to open legal URLs). There are also concrete defects in the stack:
  1. Non-recursive routes resolve with `findRoute` → `nav.find(...)` (:108, :345-351). This path is reachable: thread → author (`ThreadModal.onOpenAuthor`, :582) → "Message" (`onMessage` pushes `{k:'thread'}`, :567-568). The second `thread` entry is never rendered because `ThreadModal` keeps showing the *first* conversation. Nothing visibly happens, and the next Back pops an invisible entry.
  2. `post` and `user` are capped at three instances (`[0,1,2].map`, :497, :548). A fourth push (user → post → user → post …) goes onto the stack but has no modal to show it.
  3. Route payloads are whole objects (`{k:'post', post}`, `{k:'user', user}`, `{k:'recipe', meal}`), so they're stale snapshots. They also can't be serialised into a URL, which rules out deep links and state restoration.
  4. An opaque full-screen View (:420-425) papers over Modal mount flicker. The 2026-09-28 handover (§5.1) names an invisible full-screen overlay as part of the June freeze root cause.
- Why it matters: A social app lives on links: a shared post URL, a push notification that opens a DM, "open in app" from email. None of these can work today. The stack bugs show up as a back button that "does nothing" and taps that don't respond. Every screen's hooks also run while hidden. For example, `InboxModal` fetches conversations at launch even when closed (src/screens/InboxModal.tsx:55).
- Fix: Move to Expo Router with typed routes (`experiments.typedRoutes`). Put tabs in `(tabs)/` (feed, browse, plan, cupboard) and pushed screens in stacks (`post/[id]`, `user/[handle]`, `thread/[id]`, `recipe/[id]`). Use true `presentation: 'modal'` or form sheets only for sheets. Routes carry ids only, and screens fetch by id through the query layer. Wire `expo-notifications` response → `router.push(data.url)`, and add associated domains for universal links. In the rebuild, don't port the stack at all.
- Effort: L

### ARCH-2 · God-hook store: one 924-line `useState` blob, a new object every render, prop-drilled into 23 call sites
- Severity: Critical
- Where: src/store/useStore.ts:248 (`useStore()`), :841-921 (object literal returned every render), :924 (`type Store = ReturnType<typeof useStore>`); src/screens/HomeScreen.tsx:126 (the only call); 23 × `store={store}` across src/screens + src/components (grep); src/components/useProGate.ts:23-31 (comment documenting the workaround)
- What's wrong: The problem flagged in ARCHITECTURE-AUDIT-2026-06-09 §1 is **still present**. `useStore()` is `useState(EMPTY)` plus effects, and it's called once, in HomeScreen. The hook returns a fresh object literal with 60+ fields on every render (:841), so the `store` prop changes identity on every state change and any `React.memo` on a consumer is useless. Every mutation (a cart tick, a favourite, a filter) re-renders HomeScreen and all ~32 mounted modals. Derived data (`visibleMeals`, `allMeals`) and business rules (sign-out, account wipe, the cook log) all live in the same hook, and nothing in it is selectable.
- Why it matters: This is the main performance ceiling the June audit identified, and it never moved. For the owner, the app feels heavier as it grows. For developers, every screen depends on the whole world, which makes changes risky and tests hard to write (the only store test drives the entire hook).
- Fix: Use Zustand stores split by domain (`planStore`, `libraryStore`, `cupboardStore`, `prefsStore`) with `persist` middleware and a `version` + `migrate`. Components read through selectors (`usePlan(s => s.cart)`). Move pure transitions (toggle, prune, dedupe) into `src/domain` reducers with unit tests. Put the one-time `the-pantry/v1` import in the migration function.
- Effort: M (rebuild) / L (retrofit)

### ARCH-3 · No real server-state layer: TanStack Query is mounted but has zero queries; social data is hand-rolled `useEffect` fetches plus a custom event bus
- Severity: Critical
- Where: App.tsx:44 (`QueryClientProvider`); src/lib/queryClient.ts:14-45; `grep useQuery|useInfiniteQuery|useMutation` in src → 0 hits; src/social/useFeed.ts:124-231 (useFeed), :234-244 (usePost), :572-643 (conversations/messages/unread); src/social/events.ts (bus); src/social/supabaseFeedAPI.ts:574-595 (`.limit(200)`, ARCH-TODO)
- What's wrong: The June audit's "adopt TanStack Query" item is **only cosmetically done**. The provider and `focusManager` are wired up, but no query ever uses them. Every social read is `useState` + `useEffect` + `api.x().then(setState)`. That means no cache, no dedupe, and no retry policy, and the data is re-fetched on every mount. Invalidation happens through a hand-written pub/sub (`emit('dm:sent')` …) that only fires for *this device's own* mutations. So:
  1. Incoming DMs and notifications from other users never appear until the hook remounts. There's no realtime (`grep .channel(` → 0), no polling, and focus refetch can't help because nothing is a query.
  2. The feed is still one `limit(200)` fetch with no pagination (supabaseFeedAPI.ts:588). It's then shuffled client-side with a session seed (useFeed.ts:43-63, :153-172), which is why pagination was "BLOCKED on a product decision" (:581).
  3. `usePost` has no `.catch` (useFeed.ts:239), so a failed fetch is an unhandled rejection and the screen stays in the loading state forever.
- Why it matters: For a DM/notification product this is a correctness problem, not just a performance one: users won't see replies. It also caps the feed at 200 posts and makes each screen open cost a network round trip.
- Fix: Build one query-key factory (`qk.feed(cursor)`, `qk.post(id)`, `qk.thread(id)`…) with `useInfiniteQuery` and keyset pagination on `(created_at, id)`. Rank server-side if ranking is wanted, or drop the shuffle. Use `useMutation` with `onMutate`/`onError` rollback and `invalidateQueries`. Supabase Realtime (Broadcast) for DMs, notifications and unread counts should write into the query cache. Wire `onlineManager` to `expo-network`. Delete `events.ts`.
- Effort: L

### ARCH-4 · "Signed in" has three competing sources of truth, and account deletion can silently skip the server
- Severity: High
- Where: src/store/useStore.ts:726 (`isSignedIn = profile.name.trim().length > 0`); src/lib/supabase.ts:42-56, :144 (`cachedAuthUid`); src/social/useFeed.ts:761-783 (`viewerIdentityFromProfile` → `id: cloudUid ?? 'local-user'`, null when `profile.name` is empty); src/screens/HomeScreen.tsx:156-175 (reconcile listener), :690 vs :706; src/screens/SettingsModal.tsx:439-445
- What's wrong: Whether the user is "signed in" is decided separately by (a) whether a local display name exists, (b) a module-level cached uid, and (c) the real Supabase session. The viewer id can be the placeholder `'local-user'` while the session resolves. The delete-account flow shows the "permanently deletes your account … on every device" copy when `getAuthUidSync()` is set (:690). It then calls the server only `if (viewer)` (:706), and `viewer` is null whenever `profile.name` is empty. The Delete button is rendered unconditionally (SettingsModal.tsx:445). So with a live session and an empty local name, the local data is wiped and the user is told the account was deleted, but the server account survives. `viewerIdentityFromProfile` also mutates a global cache during render (`registerLocalUser`, useFeed.ts:781, called inside `useMemo` at :813).
- Why it matters: Account deletion that doesn't delete is an App Store 5.1.1(v) and privacy-policy problem. The split identity also causes the "own profile shows zero posts / isMe fails" class of bug that the code comments already describe fixing once.
- Fix: Have a single `useSession()` backed by Supabase `onAuthStateChange`, exposed through a small auth store (`status: 'loading'|'signedOut'|'signedIn'`, `userId`). The profile comes from a `useMe()` query keyed on `userId`. Nothing derives auth from local profile fields. Gate account actions on `session`, not `viewer`.
- Effort: M

### ARCH-5 · OTA safety: `runtimeVersion: appVersion` with the version stuck at 1.0.0, so an update can reach a binary that lacks its native modules
- Severity: High
- Where: app.json:3-4 (`"version": "1.0.0"`), `runtimeVersion.policy: "appVersion"`; eas.json:3 (`appVersionSource: remote`), `production.autoIncrement: true`; package.json caret ranges on native modules (`react-native-purchases ^10.2.1`, `@shopify/flash-list ^2.3.1`); patches/expo-video+3.0.16.patch (native Swift changes)
- What's wrong: `autoIncrement` bumps the build number, not `version`. So every TestFlight build (#1–#12, which had different native module sets) shares runtime `1.0.0`, and an `eas update` to the `production` channel is offered to all of them. Nothing (no fingerprint policy, no CI check) stops a JS bundle that imports a native module from reaching a binary that doesn't contain it. HANDOVER-REBUILD §5.4 records this failure mode as a lesson learned. The code still allows it.
- Why it matters: One bad OTA crashes the app on launch for every installed user, and the fix needs a new store build and review.
- Fix: Set `runtimeVersion: { policy: "fingerprint" }` and run `npx expo-updates fingerprint:generate` or `@expo/fingerprint` in CI to fail when native changes land without a new build. Keep separate `preview` and `production` channels (already present) and add a staged rollout (`eas update --rollout-percentage`). Pin native deps with `~` or exact versions.
- Effort: S

### ARCH-6 · A failed or corrupt hydration silently overwrites the user's saved data with an empty state
- Severity: High
- Where: src/store/useStore.ts:252-301 (hydrate; `} catch {}` at :299, then `setLoaded(true)` at :300), :318-329 (persist effect keyed on `[state, loaded]`)
- What's wrong: If `AsyncStorage.getItem` throws or the blob fails `JSON.parse`, the error is swallowed, `state` stays `EMPTY`, and `loaded` becomes `true`. The persist effect then fires and writes `EMPTY` over the stored key 500 ms later. There's no schema version, no backup key, and no telemetry on the failure. Separately, the 500 ms debounce only flushes on unmount (:332-344), not on `AppState` → `background`, so a change made just before the app is killed can be lost.
- Why it matters: One malformed write (for example, a crash mid-write of a large blob with data-URI avatars, useStore.ts:90-94) permanently erases the user's plan, collections, cupboard and custom recipes, with no trace.
- Fix: On a hydrate error, don't enable persistence. Keep the raw blob under `…/corrupt-<ts>`, log to Sentry, and show a recovery message. Add a `version` field and explicit migrations (Zustand `persist` gives both). Flush on `AppState` change. Store avatars and images as files, not inside the JSON blob.
- Effort: S

### ARCH-7 · Fake data ships in production paths, and a misconfigured build silently falls back to a simulated social network
- Severity: High
- Where: src/social/feedApi.ts:233-250 (`cached = supabaseConfigured ? getSupabaseFeedAPI() : getLocalFeedAPI()`); src/screens/BrowseModal.tsx:29, :196-206, :458-466 (People tab lists `SIMULATED_USERS`); src/social/notifications.ts:22, :49-80 (synthesised notifications); src/social/simulatedData.ts (720 lines); src/social/localFeedApi.ts:331-337 (feed = `SIMULATED_POSTS` + mine)
- What's wrong: The Browse → People tab renders the hard-coded simulated users in every mode, including cloud mode. Tapping one opens a profile whose id doesn't exist in Supabase. If `EXPO_PUBLIC_SUPABASE_ENABLED` is not `'1'` at build time, the whole social layer (feed, DMs, notifications) quietly switches to in-memory fake users and posts. Only a `logger.warn` records it. The production profile in eas.json:33-43 does not set any Supabase variable, so correctness depends on server-side EAS env vars that the repo can't show.
- Why it matters: Real users would be shown fake "home cooks" they can't message. That's misleading content under App Review guideline 2.3, and it breaks the CLAUDE.md "no fake" rule. A wrong env on one build would ship a fully fake social app with nothing to warn anyone.
- Fix: Delete the local/simulated backend from the app bundle and keep fixtures in tests or Storybook only. Validate config at startup (see ARCH-15). In production, a missing backend config should fail loudly (error screen + Sentry), not degrade to fake data. Build People search on `searchUsers`.
- Effort: S

### ARCH-8 · Untyped, hand-mapped API layer with layers reaching into each other's caches
- Severity: High
- Where: src/lib/supabase.ts:31, :83 (`createClient(url, anon, …)` with no `Database` generic; `grep Database|database.types` → 0); src/social/supabaseFeedAPI.ts (1,490 lines; `BiteRow`/`ProfileRow` hand-typed casts, e.g. :589 `as BiteRow[]`); :78 and :523-547 (Supabase impl writes into `localFeedApi`'s `cacheUsers`); :480-486 (comment: FeedAPI `viewerId` params are ignored, "local store still hardcodes 'local-user'"); src/social/useFeed.ts:8 (data layer imports `showToast` from UI)
- What's wrong: Table and column names are strings with hand-written row types, so schema drift only shows up at runtime. The `FeedAPI` interface takes a `viewerId` on every mutation that the real implementation ignores, so the contract misleads. The Supabase implementation depends on the local mock's in-memory user map so that `getAuthorSync` (a synchronous render-time lookup) can resolve author names. The data hooks trigger UI (toasts) directly.
- Why it matters: Refactors to the schema (16 migrations so far) break silently. The local-cache coupling means a stale or missing author renders as "@unknown". It also keeps the fake backend (ARCH-7) load-bearing.
- Fix: Generate types (`supabase gen types typescript`) and use `createClient<Database>()`. Split the API into small per-resource modules (`api/posts.ts`, `api/profiles.ts`, `api/dm.ts`) that return domain types via tested mappers. Authors come from joined selects (`select('*, author:profiles(*)')`) or the query cache, never a global Map. Take the actor from the session inside the API, not from parameters. UI feedback belongs in mutation `onSuccess` at the screen level.
- Effort: M

### ARCH-9 · Sign-out and delete teardown is scattered and incomplete
- Severity: High
- Where: src/screens/HomeScreen.tsx:676-684 (`void signOutEverywhere(); store.signOutProfile();`), src/screens/ProfileModal.tsx:111-112 (duplicate path); src/auth/signOutEverywhere.ts:19-33; src/store/useStore.ts:690-697, :716-724 (`wipeAllLocalData` removes only `the-pantry/v1`); src/push/pushClient.ts:121-175 (token upsert; no delete on sign-out); src/screens/CreatePostModal.tsx:109, :156 (per-user drafts in AsyncStorage); src/themeMode.ts:13, src/a11y.ts:10
- What's wrong: Sign-out doesn't remove the device's `push_tokens` row, doesn't clear the social cache (`the-pantry/social/v1`, the in-memory `usersById`), doesn't clear module-level caches (`notifications.ts:44 cached`, `useFeed.ts:121 sessionCreatedPostIds`), and doesn't clear the query cache. The remote sign-out is fire-and-forget while local state is cleared immediately. "Delete account" leaves post drafts, theme and contrast keys behind. The same orchestration is copy-pasted in two screens.
- Why it matters: On a shared device, the next person can see the previous user's cached social state, and once push delivery goes live the device will keep receiving the old account's DMs. The privacy policy promises deletion of local data.
- Fix: Write one `session.signOut()` / `session.deleteAccount()` use-case in a service module that awaits, in order: push-token delete → RevenueCat logout → Supabase signOut → `queryClient.clear()` → reset every persisted store → clear the draft namespace. Cover it with one integration test.
- Effort: S

### ARCH-10 · Error handling: one root boundary, raw error text shown to users, 35 swallowed errors
- Severity: Medium
- Where: App.tsx:59-61 (the only `<ErrorBoundary>`, no `onReset`); src/components/ErrorBoundary.tsx:71-87 (renders `error.message`); 35 × `catch {}` / `.catch(() => {})` in src (grep); src/social/useFeed.ts:239 (no catch); no global `ErrorUtils`/unhandled-rejection hook
- What's wrong: A render error in any modal replaces the whole app with "Something broke" plus the raw message. "Try again" remounts HomeScreen, which throws away navigation state and re-runs store hydration. Many failures (storage, push channel setup, legal links, hydration) are silently discarded.
- Why it matters: One bad post payload takes down the whole app instead of one screen, and internal error strings can leak to users. Silent catches hide real faults, as ARCH-6 shows.
- Fix: With Expo Router, export `ErrorBoundary` per route or group, plus a root fallback with friendly copy. Tag errors with the route in Sentry. Replace blanket `catch {}` with `logger.warn` at minimum, and give each screen a designed error state fed by query `error`.
- Effort: S

### ARCH-11 · Local and server "saved" models are duplicated, and the server tables sit unused
- Severity: Medium
- Where: supabase/migrations/0001_initial_schema.sql:210-222 (`recipe_bookmarks`, plus `collections`, `collection_items`); `grep from('recipe_bookmarks'|'collections'|'collection_items')` in src → 0; src/store/useStore.ts (favorites, collections local only); src/social/useFeed.ts:431-497 (`bite_bookmarks` "Cookmarks" via server)
- What's wrong: Recipe favourites and collections exist only on the device, while the database has tables for them that the client never touches. Post bookmarks go to the server. Both concepts appear in the UI under similar names.
- Why it matters: Users with an account expect their saves to survive a reinstall or a new phone, and they won't. Two save models confuse users and double the code paths.
- Fix: Decide per entity: local-first with sync, or server-owned. For the rebuild (local-first v1), drop the unused tables from the new schema. If sync lands later, use one `saves` model with a sync queue.
- Effort: M

### ARCH-12 · Persistence is five ad-hoc AsyncStorage mechanisms with no versioning
- Severity: Medium
- Where: src/store/useStore.ts:102-105 (`the-pantry/v1` + legacy keys), src/social/localFeedApi.ts:31, :82-107, :230; src/themeMode.ts:13-51; src/a11y.ts:10; src/screens/CreatePostModal.tsx:109-156, :293
- What's wrong: Each module invents its own key, legacy-key migration, debounce and error swallowing. The main blob is one JSON string holding everything (custom recipes, cook log with no cap at useStore.ts:741, avatar URIs), rewritten in full on every change. None of the keys carries a schema version.
- Why it matters: Writes are slow and all-or-nothing, migrations are guesswork, and "wipe my data" can't be complete because nobody owns the key list (ARCH-9).
- Fix: Use one persistence adapter (`src/lib/storage.ts`) with a key registry, one Zustand `persist` store per slice with `version`/`migrate`, and MMKV if a native dependency is acceptable. Media goes to the file system, and the log gets a cap.
- Effort: M

### ARCH-13 · Monolith screens mix fetching, business rules and UI, and there are no enforced module boundaries
- Severity: Medium
- Where: 40 non-test files over 300 lines (e.g. src/screens/PantryModal.tsx 1,696; RecipeModal.tsx 1,375; CreatePostModal.tsx 1,265; CartModal.tsx 1,190; BrowseModal.tsx 1,189; SpinnerModal.tsx 1,150; HomeScreen.tsx 956; FeedScreen.tsx 907); src/screens/HomeScreen.tsx:685-731 (account-deletion orchestration inline in JSX props); src/data/dataExport.ts:14, compressMedia.ts:32-33 (react-native/expo inside "data"); src/components/useProGate.ts:4-5 and FirstRunChecklist.tsx:5 (components → store); eslint.config.js (no import-boundary rules); no path aliases in tsconfig.json
- What's wrong: This is the June audit §9 finding, **still present**: of the four monoliths it named, PantryModal is unchanged and RecipeModal went from 1,589 to 1,375 lines. It's a layer-style folder layout (`screens/`, `social/`, `data/`) with nothing stopping cross-imports.
- Why it matters: The files are hard to review, test or memoise, and every change touches a 1,000-line file. The rebuild's CLAUDE.md rule (files under 300 lines, features never import features) is exactly what this code lacks.
- Fix: Use a feature-sliced layout (see the target section), with `eslint-plugin-boundaries` or `import/no-restricted-paths` rules plus a max-lines rule in CI. Each screen is a container hook (data) plus presentational pieces.
- Effort: L (retrofit) / S (enforce from day one in v2)

### ARCH-14 · Content-as-code: a 14,357-line `recipes.ts` in the JS bundle, loaded at startup
- Severity: Medium
- Where: src/data/recipes.ts (14,357 lines); imported by src/store/useStore.ts:13-19 (`getRecipe`) and therefore by HomeScreen's first render
- What's wrong: The whole catalogue is TypeScript source, parsed on startup and changeable only through a build or OTA.
- Why it matters: It slows cold start and bloats OTA updates, and fixing a typo in a recipe means shipping code. It also mixes editorial content with app logic, even though the catalogue's provenance (AI-generated) is itself an open product decision.
- Fix: v2 already moved to a JSON catalogue with a conversion script (D-014). Keep that. Load it lazily or index it (id → summary for lists, full recipe on demand), and consider remote content later.
- Effort: S (done in v2)

### ARCH-15 · Config is read ad hoc from `process.env` in 11 files, with no validation and a split source of truth
- Severity: Medium
- Where: `grep -l process.env` → src/auth/socialLogin.ts, src/social/feedApi.ts, src/social/notifications.ts, src/pro/ai/client.ts, src/pro/purchases.ts, src/pro/purchaseMapping.ts, src/push/pushClient.ts, src/store/useStore.ts, src/lib/sentry.ts, src/lib/supabase.ts, src/screens/HomeScreen.tsx; eas.json:10-11, :38-40 (some keys inline) vs `environment: production` (the rest in EAS server env); .env.example:40-44 (still documents `EXPO_PUBLIC_OPENAI_API_KEY`)
- What's wrong: There's no single typed config module. Each file checks env vars differently (`=== '1'`, truthy, try/catch around `getSupabase()`), and required production values are split between the repo and the EAS dashboard. The template still invites putting an OpenAI key in an `EXPO_PUBLIC_` variable, which would be inlined into the bundle if anything ever referenced it again.
- Why it matters: A missing variable degrades silently (ARCH-7), and nobody can tell from the repo what a production build actually contains.
- Fix: Add `src/config.ts` that parses env once with a schema (zod or a hand-written validator), exports a frozen typed object, and throws at startup in release builds when required keys are missing. Keep all non-secret build variables in EAS environments, documented in one table, and remove the OpenAI line from the template.
- Effort: S

### ARCH-16 · Observability is half-wired: no symbolication, no release tagging, dead tracing code
- Severity: Medium
- Where: src/lib/sentry.ts:34-57 (`environment: __DEV__ ? … : 'production'`, no `release`/`dist`, no expo-updates id); eas.json:11, :23, :40 (`SENTRY_DISABLE_AUTO_UPLOAD: "true"` in every profile); metro.config.js:13 (plain `getDefaultConfig`, not `getSentryExpoConfig`); src/lib/screenTracing.ts (never imported); src/lib/sentry.ts:25 (`sendingEnabled = true` until the store hydrates, so the opt-out isn't honoured during startup)
- What's wrong: Preview and production builds both report as "production". Source maps are never uploaded, so release stack traces are minified. OTA updates aren't tagged, so you can't tell which update crashed. The TTID/TTFD work from the June audit exists but isn't used. The handover also notes that no DSN is set.
- Why it matters: When a launch-day crash happens, you won't be able to see where it is or which update caused it.
- Fix: Set `environment` from the EAS build profile or channel. Set `release`/`dist` from `expo-application` plus `Updates.updateId`. Use `getSentryExpoConfig` and enable source-map upload for production and `eas update`. Read the opt-out before `Sentry.init`. Add React Navigation / Expo Router integration for screen spans.
- Effort: S

### ARCH-17 · Dependency hygiene: unused native modules (one adds a microphone permission), a native patch, tooling mixed into app deps
- Severity: Medium
- Where: package.json (`expo-audio` in deps and app.json plugins, with 0 imports in src; `@shopify/flash-list` with 0 imports; `react-native-purchases` with a caret on a native module); app.json android.permissions (`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`); patches/expo-video+3.0.16.patch (Swift edits, mostly warning suppression plus one added `await`); devDependencies `openai`, `sharp`, `ffmpeg-static`, `@expo/ngrok` (used only by scripts/)
- What's wrong: Unused native modules bloat the binary and add permissions that have to be justified in store privacy answers. The FlashList dependency is left over from the reverted freeze change. The native patch has to be re-verified on every expo-video bump. Heavy media tooling installs a binary (ffmpeg) on every CI run.
- Why it matters: Reviewers can flag permissions with no visible feature, CI installs are slower, and you're maintaining more native surface than you use.
- Fix: Remove `expo-audio` (and its plugin and permissions) and `flash-list`. Move content scripts to a separate `tools/` package with its own package.json. Drop the patch unless a concrete build break needs it. Add `npx expo-doctor` and `npx expo install --check` to CI.
- Effort: S

### ARCH-18 · Backend drift and dead code: a draft migration in the apply path, numbering gaps, orphaned modules
- Severity: Medium
- Where: supabase/migrations/0013_feed_ranking_v1.sql:1-12 ("DRAFT — NOT YET APPLIED", references `src/social/feedRanking.ts` and `getFeedPage`, neither of which exists); migrations 0011 + 0011a, no 0015; no `supabase/config.toml`; src/social/feedCursor.ts and src/lib/screenTracing.ts (referenced only by tests or comments)
- What's wrong: The repo's migration folder doesn't represent production. A `supabase db push` would apply the draft. There's no local Supabase config for reproducible dev or CI. Dead modules survive because tests still cover them.
- Why it matters: Handover §5.6 already records repo/prod drift. This setup makes it likely to happen again.
- Fix: For v2, start with `supabase init` (config.toml), CLI timestamped migrations, and CI that runs `supabase db reset` + lint on a local stack. Keep drafts outside `migrations/`, and delete the dead modules.
- Effort: S

### ARCH-19 · List rendering items from the June audit are still open
- Severity: Medium
- Where: src/screens/FeedScreen.tsx:278-303 (FlatList with inline `renderItem`, no `onEndReached`, no windowing props); `grep recyclingKey|cachePolicy` in src → 0; 29 files use ScrollView
- What's wrong: The June audit's §4/§5 items are **still present** in this code: inline `renderItem` defeats tile memoisation, there's no infinite loading, and expo-image has no recycling or cache hints.
- Why it matters: Scrolling gets janky and uses more memory as content grows.
- Fix: Hoist a memoised `renderItem`, paginate via `useInfiniteQuery`, and set `recyclingKey={post.id}` + `cachePolicy="memory-disk"`. Stay on FlatList until something is measured, which fits the freeze lesson.
- Effort: S

### ARCH-20 · The navigation and orchestration layer has no tests, and CI is currently red
- Severity: Medium
- Where: test distribution: 19 in src/data, 7 in src/social, 4 in src/lib, 1 each elsewhere, 0 in src/screens; jest.config.js:23-27 (coverage limited to data and social); .github/workflows/ci.yml:41-42 (runs `npm run lint`, and the baseline has 3 eslint errors, so the job fails)
- What's wrong: The most bug-prone code (HomeScreen's stack, the delete and sign-out flows, hydration) has no tests. CI exists (the June item is done) but is failing on lint, so it isn't being used as a gate. There's also no bundle export, `expo-doctor` or fingerprint step.
- Why it matters: Regressions like the June freeze and the ARCH-1 stack bugs get through. A red CI that everyone ignores gives no protection.
- Fix: Keep CI green as a merge rule. Add `expo export` (bundle build), `expo-doctor`, a fingerprint diff and Maestro smoke flows. Write integration tests for the session use-cases and the store migration.
- Effort: S

### ARCH-21 · Render-phase side effects and module-load singletons
- Severity: Low
- Where: src/social/useFeed.ts:781 (`registerLocalUser` inside `viewerIdentityFromProfile`, run from `useMemo` at :813); src/social/useFeed.ts:28 (`const api = getFeedAPI()` at import time, choice cached forever at src/social/feedApi.ts:249); src/social/notifications.ts:44 (`cached` never reset)
- What's wrong: Global mutation happens during render, and backend selection is frozen at import time.
- Why it matters: React 19 concurrent rendering can run memos more than once, and tests have to mock at import time. Values cached for the first viewer carry over to the next one.
- Fix: Pass dependencies through the query client or context, and keep render pure.
- Effort: S

### ARCH-22 · Repo sprawl makes the true state hard to find
- Severity: Low
- Where: repo root: `The Hub/` (a nested, abandoned SwiftUI project with its own .git), 8 root-level `*.md` audits (some gitignored via `AUDIT-*.md` in .gitignore), 22 files in docs/ with overlapping status reports
- What's wrong: Several documents disagree with each other and with the code. For example, the June audit counts 17 test files and 168 tests, while the baseline is 36 suites.
- Why it matters: Future sessions (human or AI) act on stale docs.
- Fix: v2 already has REBUILD-MAP, DECISIONS and KNOWN-ISSUES. Keep one living status file, archive the rest, and keep unrelated projects out of the repo.
- Effort: S

### ARCH-23 · Minor config nits
- Severity: Low
- Where: app.json (`ios.supportsTablet: true` with no tablet layouts; no `associatedDomains`; `backgroundColor #FFFFFF` vs the dark brand canvas); tsconfig.json (no `noUncheckedIndexedAccess`, no path aliases)
- What's wrong: iPad support means iPad screenshots and review on iPad. There's no universal-link setup for social sharing. Index access on typed arrays and maps isn't checked by the compiler.
- Why it matters: Small launch friction and a class of runtime `undefined` bugs.
- Fix: Set `supportsTablet: false` unless iPad is designed for. Add associated domains alongside the router work. Turn on `noUncheckedIndexedAccess` in v2 from the start.
- Effort: S

---

## Status of previously reported problems (verified in code)

- No shared reactive store / prop drilling (June audit §1, handover §5.3): **still present** (ARCH-2).
- No server-state layer, `limit(200)`, no pagination (§2): **still present**. The provider is mounted but has zero queries (ARCH-3).
- No navigation library / modal stack (§3, handover §5.2): **still present**, with additional stack bugs found (ARCH-1).
- Feed not virtualised properly, inline `renderItem`, no `onEndReached` (§4): **still present** (ARCH-19). FlashList was reverted, and the dependency is left behind unused.
- expo-image `recyclingKey`/`cachePolicy` (§5): **still present** (0 usages).
- Zero realtime (§7): **still present** in the client (0 `.channel(`). The handover says Realtime was enabled server-side for bites and comments.
- Offline / onlineManager (§8): **still present**. The comment at src/lib/queryClient.ts:32-34 says it's deferred.
- Monolith screens (§9): **still present** (ARCH-13).
- No CI (§10): **fixed**. .github/workflows/ci.yml exists, but it fails on the current lint errors (ARCH-20).
- Sentry TTID/TTFD (§10): **code exists but is never imported** (ARCH-16).
- Backend drift (handover §5.6): **still possible**. 0013 is a draft in the migrations path (ARCH-18).
- OTA native-import crash risk (handover §5.4): **still unguarded** (ARCH-5).
- Invisible full-screen overlay (handover §5.1): the pattern **is still in the code** (HomeScreen.tsx:420-425 matte, `pointerEvents="none"`).

---

## Recommended target architecture

**Principles.** Local-first for v1, a server-state layer for anything remote, pure domain logic, and thin routes. Each item below replaces a specific failure found above.

**Folder layout (feature-sliced).**
```
src/
  app/                      Expo Router routes only (thin): (tabs)/, recipe/[id], plan/, cook/[id], settings/
                            Later: post/[id], user/[handle], inbox/, thread/[id]
  features/<name>/          discover, recipe, plan, shop, cupboard, cook, settings (later: feed, profile, dm)
    screens/                container screens (≤300 lines): call hooks, render components
    components/             presentational, memoised, no data access
    hooks/                  feature hooks: selectors, query hooks, mutations
    index.ts                public surface; features never import each other's internals
  domain/                   pure TS, no React, no packages: scaling, units, grocery consolidate/aisles,
                            pantry match, plan rules, reducers for store transitions (+ node:test)
  data/catalogue/           recipes.json (generated by script), ingredient DB
  stores/                   Zustand stores per slice (plan, library, cupboard, prefs), persist + version/migrate
  services/                 cross-feature use-cases: session (sign in/out/delete), migration from the-pantry/v1, export
  api/                      (when social lands) typed Supabase client createClient<Database>, per-resource modules,
                            row→domain mappers, query-key factory
  lib/                      config.ts (validated env), storage.ts (key registry), logger/sentry, queryClient
  ui/                       tokens, primitives (Text, Button, Sheet, EmptyState, ErrorState), theme
```
Enforce this with ESLint boundary rules (`app → features → domain/ui/lib`, never `features/a → features/b`), max-lines 300, and no literals outside `ui/tokens`.

**Navigation.** Use Expo Router with typed routes. A tab group holds the three loops (Discover, Plan, Cook/Tonight) plus Cupboard. Detail screens are stack pushes addressed by id. Sheets use native form-sheet presentation or a single sheet host, never an always-mounted `<Modal>` per screen. Each route group exports an `ErrorBoundary`. Deep links come free from the file tree (`thepantry://recipe/abc`). When social arrives, add universal links and route push-notification taps with `router.push(data.url)`.

**State.**
- *Local/UI state:* Zustand, one store per domain slice, read via selectors. Persist middleware on AsyncStorage (or MMKV if a native dependency is approved), with `version` + `migrate`. Hydration failures are quarantined, never overwritten. Flush on `AppState` background. The shopping list is **derived** by a `domain/` function from plan + exclusions + pantry, never stored.
- *Ephemeral screen state:* `useState` inside the screen.
- *Server state (sync, later social):* TanStack Query is the only cache. There's a query-key factory, and `useInfiniteQuery` with keyset cursors is used for any list. Mutations use `onMutate` optimistic updates with rollback, and set-style endpoints (`setLiked(true)`) rather than toggles. `onlineManager` + `focusManager` are wired up, and persisted mutations cover offline writes. Realtime Broadcast pushes into the query cache for DMs, notifications and unread counts.
- *Auth:* one session store fed by `onAuthStateChange`. Identity = `session.user.id`, and the profile is a query. Teardown is a single awaited use-case.

**Data layer.** `supabase gen types` feeds `createClient<Database>`. Each resource module returns domain types through tested mappers, joins authors in the select, and never reaches into another module's cache. Migrations use Supabase CLI timestamps, deploy only from CI, keep drafts outside `migrations/`, and run `supabase db reset` + tests on a local stack in CI.

**Config and release.** A validated `config.ts`. EAS environments hold all public env vars. `runtimeVersion: fingerprint`, a CI fingerprint diff, channels `preview` and `production`, and staged OTA rollouts. Sentry with environment from the channel, `release`/`dist`/`updateId`, and source maps uploaded for builds and updates. CI gates: typecheck, lint, tests, `expo export`, `expo-doctor`, fingerprint, and a Maestro smoke run on preview builds.

---

## Good, and worth keeping

- **Pure domain modules with real tests.** `src/data/` holds scaling, unit conversion, grocery consolidation/normalisation/aisles, pantry match, substitutions, season, import-from-URL and search, backed by 19 test files in `src/data/__tests__/`. This is the specification for the hardest logic, and it is mostly free of React (only 4 files import `react-native`).
- **Design tokens.** `src/theme.ts` (210 lines) has light, dark and high-contrast palettes and a cuisine accent function.
- **Secure session storage.** `src/lib/secureSessionStorage.ts` keeps the Supabase session in Keychain/Keystore with chunking. The lazy singleton Supabase client with PKCE (`src/lib/supabase.ts:71-131`) is the right shape.
- **Distrusting persisted entitlements.** Pro isn't trusted from AsyncStorage when RevenueCat is configured (`src/store/useStore.ts:66-83`, :288-292).
- **Sentry PII scrubbing.** The `beforeSend` scrubber and user opt-out are in `src/lib/sentry.ts:55-90`. The logger discipline in `src/lib/logger.ts` is also sound.
- **Snapshot rollback for optimistic toggles** (useFeed.ts:410-425). The idea carries over directly into `onMutate` context.
- **Batch liked-ids fetch** replacing N+1 per-tile queries (`getLikedPostIds`, supabaseFeedAPI.ts:1039 area; useFeed.ts:180-192).
- **Backend work to reuse as reference:** the RLS init-plan rewrite + FK indexes (migration 0010), function search_path hardening (0009/0014), and the `ai-proxy` and `delete-account` Edge Functions.
- **Store assets:** CI workflow skeleton, the privacy manifest in app.json, bundle ID/EAS project continuity, and the `the-pantry/v1` key with legacy-key migration as the source for the v2 one-time import.
