# Performance, reliability and observability audit: old app (read-only)

Scope: `/home/claude/old-audit` (Expo SDK 54, RN 0.81.5, React 19.1, New Architecture on).
Method: static reading of the code. All line numbers were checked against the source. Assets were not supplied, so the asset-weight figures are estimates and are labelled that way.

Counts: **Critical 1 · High 9 · Medium 11 · Low 8** (29 findings).

---

## Status of docs/AUDIT-PERFORMANCE-2026-06-10.md, checked against the code

| Prior item | Status now | Evidence |
|---|---|---|
| P1: monolithic store causes a whole-tree re-render | **Still present, and the quick win was never done.** There are zero `React.memo` components in `src/`. `grep -rn "React.memo\|memo(" src` returns nothing. | `src/store/useStore.ts:249`, `src/screens/HomeScreen.tsx:126`, and `store` passed to about 20 children |
| P2: feed capped at 200, no pagination, all authors prefetched | **Still present.** The feed is also fetched twice (see PERF-2). | `src/social/supabaseFeedAPI.ts:584-593` |
| P3: unbounded `ScrollView` + `.map` lists | **Partly fixed.** Pantry matches are now `slice(0, 10)` (`PantryModal.tsx:666,691`). Cookmarks, the Cart shopping list, the UserProfile grid, comments and DM threads are still unvirtualised. | PERF-13, PERF-17 |
| P4: monolith screens | **Still present.** PantryModal is 1,696 lines, CreatePostModal 1,265, CartModal 1,190, BrowseModal 1,189, SpinnerModal 1,150 and RecipeModal 1,375. | `wc -l src/screens/*.tsx` |
| Quick win: `recyclingKey` on feed tiles | **Not present.** `grep recyclingKey src` returns nothing. | – |
| "Already good: FlashList feed with memoised, recycling-keyed cells" | **False.** The feed is a plain `FlatList`. `@shopify/flash-list` is a dependency but is imported nowhere. Cells are not memoised. | `FeedScreen.tsx:3,278`, `package.json` |
| "Already good: Sentry TTID/TTFD screen tracing wired" | **False.** `src/lib/screenTracing.ts` is never imported outside its own test. | PERF-16 |
| "Already good: expo-image app-wide" | True. No RN `Image` imports were found. | – |

---

### PERF-1 · Every state change re-renders the whole app, including about 40 hidden screens
- Severity: Critical
- Where: `src/store/useStore.ts:249`, `src/store/useStore.ts:841-921`, `src/screens/HomeScreen.tsx:126`, `src/screens/HomeScreen.tsx:428-949`
- What's wrong: All persisted state lives in one `useState<Persisted>` (`useStore.ts:249`), and `useStore()` is called once in `HomeScreen` (`:126`). The returned `store` object is a new literal on every render (`:841-921`, no `useMemo`). HomeScreen then renders about 40 screen components at the same time: BrowseModal, PantryModal, CartModal, SpinnerModal, CreatePostModal, 3× PostDetailModal, PostRecipeModal, 3× UserProfileModal, Thread, Inbox, SavedPosts, Filters, CustomMeals, Recommended, Profile, Cookmarks, Collections, FilteredMeals, Stats, Settings, ResultDetail, Recipe, CookMode, SideDrawer, five sheets, RecipeEditor, Onboarding, ProfileSetup and Paywall (`:428-949`). Almost all of them receive `store={store}` plus inline arrow props such as `onOpenRecipe={(meal) => push(...)}` (`:432`, `:449`, `:472` and others). None is memoised. Every hidden screen's function body runs on every render, including its `useMemo` dependency checks and hooks. `ScreenModal` is a plain absolutely positioned view, not a native modal, so hidden screens really are mounted (`components/ScreenModal.tsx:10-24`). The tab roots Browse, Pantry and Cart use `keepMounted` (`BrowseModal.tsx:508`, `PantryModal.tsx:442`, `CartModal.tsx:295`), so once visited their whole subtrees stay mounted at opacity 0 and re-render too. FeedScreen also gets fresh inline props (`HomeScreen.tsx:403-404`), which re-renders every visible feed tile.
- Why it matters: Ticking one grocery item, opening a recipe (which calls `recordView` and rewrites state) or tapping a filter chip re-renders the Feed grid, the hidden Browse list, the Pantry matcher, the Cart planner and dozens of invisible screens. That is the jank users feel on older iPhones, and it gets worse as more features are added.
- Fix: For the v2 rebuild, use a selector-based store (Zustand with `useStore(s => s.cart)` per component) and real navigation (Expo Router) so that off-screen routes are not rendered at all. If the old app has to ship first: wrap the returned store object in `useMemo`, stabilise every callback prop with `useCallback`, `React.memo` every screen, and return `null` from the body of non-keepMounted screens when `!visible`.
- Effort: L

### PERF-2 · Hidden screens fire a burst of about 15 network requests at startup, several of them duplicates
- Severity: High
- Where: `src/screens/BrowseModal.tsx:144`, `src/screens/FeedScreen.tsx:149`, `src/screens/CookmarksModal.tsx:57`, `src/screens/SavedPostsModal.tsx:35`, `src/screens/InboxModal.tsx:55`, `src/screens/SendToSheet.tsx:47`, `src/screens/ComposeMessageSheet.tsx:40`, `src/screens/HomeScreen.tsx:238-239`, `src/screens/HomeScreen.tsx:321-342`
- What's wrong: Data hooks sit in component bodies that run whether or not the screen is visible:
  - `useFeed` runs in both FeedScreen and the hidden BrowseModal. Each call is `bites.limit(200)`, then a `profiles.in(200 ids)` lookup, then `getLikedPostIds(200 ids)`, so the feed is fetched twice.
  - `useSavedPosts` runs in both Cookmarks and SavedPosts.
  - `useConversations` in Inbox is not gated on `visible`. Notifications are gated (`InboxModal.tsx:56,61`).
  - `useUserSearch('')` runs immediately in both SendToSheet and ComposeMessageSheet (`useFeed.ts:290-292`).
  - There are also the unread-total and notification-count calls, plus the profile-handle check.

  None of this goes through the shared cache: TanStack Query is installed but no `useQuery` exists anywhere (see PERF-14).
- Why it matters: A cold start on mobile data makes about 15 requests before the user taps anything. That delays the feed, costs battery and data, and doubles Supabase read load per user.
- Fix: Gate every fetch on `visible` (pass `null` ids when hidden) as a stopgap. Properly: move reads to `useQuery` with shared keys (`['feed']`, `['savedPosts', uid]`) so that duplicate mounts de-duplicate, and only mount a route when it is navigated to.
- Effort: M

### PERF-3 · The onboarding background video loads and plays, looping, on every launch forever
- Severity: High
- Where: `src/screens/OnboardingModal.tsx:95-99`, `src/screens/HomeScreen.tsx:916-930`
- What's wrong: `useVideoPlayer(require('../../assets/welcome-bg.mp4'), p => { p.loop = true; p.muted = true; p.play(); })` sits in the OnboardingModal component body. HomeScreen mounts OnboardingModal unconditionally. So even for users who finished onboarding months ago, a native AVPlayer is created and set playing on a loop for the whole session. The `VideoView` is not on screen, but the player still decodes.
- Why it matters: A hidden hardware video decoder runs for the life of the app. That drains battery, adds memory pressure and slows startup, and it can interact with the iOS audio session, for example nudging a user's Spotify or podcast.
- Fix: Move the player into a child component that only mounts while `visible` is true (or only for step 0), and release it on unmount. Better still for v2: use a poster image and no video, or a short, heavily compressed clip.
- Effort: S

### PERF-4 · Feed videos keep playing under other screens and in the background
- Severity: High
- Where: `src/screens/FeedScreen.tsx:298`, `src/screens/FeedScreen.tsx:471-479`, `src/screens/FeedScreen.tsx:601-626`, `src/screens/HomeScreen.tsx:420-425`
- What's wrong: Tile playback is driven only by `visibleIds` from `onViewableItemsChanged` (`:298`). Hero cards use `active={i === page}` (`:475`). When any screen is pushed, the feed stays mounted under an opaque "matte" view (`HomeScreen.tsx:420-425`). Viewability does not change, so the visible video tiles and the current hero video keep playing. Nothing listens to `AppState` to pause on background. Every video tile also creates its own `useVideoPlayer` on mount (`:607`), and FlatList keeps about 21 screens' worth of items mounted by default (`windowSize` is not set), so there are many live players.
- Why it matters: Hidden videos decode while the user reads a recipe, battery drains, and on low-memory devices there is a risk of the app being killed in the background. Several simultaneous `AVPlayer`s are also a known crash source.
- Fix: Pass an `isFocused` flag (for example `nav.length === 0`) into FeedScreen and AND it into `active`. Pause everything on `AppState !== 'active'`. Only create a player for the one or two tiles actually visible, and render a poster `Image` everywhere else. Set a small `windowSize`.
- Effort: M

### PERF-5 · The feed grid is an unmemoised FlatList that re-renders every tile on each scroll or viewability change
- Severity: High
- Where: `src/screens/FeedScreen.tsx:278-313`, `src/screens/FeedScreen.tsx:501-516`, `src/screens/FeedScreen.tsx:162-166`, `src/screens/FeedScreen.tsx:253-275`
- What's wrong:
  - It is a `FlatList` with an inline `renderItem` (`:294`).
  - `FeedTile` is a plain function, not memoised (`:501`).
  - `active={visibleIds.has(item.id)}` means each viewability event (`setVisibleIds(new Set(...))`, `:164`) re-renders the whole list.
  - Each tile, hero and video component calls `useMemo(() => makeStyles(theme))` (`:516`, `:603`, `:331`), so every mounted tile builds the whole feed stylesheet.
  - `ListHeaderComponent` is a new element every render (`:253`), so the filter bar and hero carousel re-render too.
  - `getAuthorSync` and `useLikeState` run per tile.
  - There is no `getItemLayout`, `windowSize`, `maxToRenderPerBatch` or `removeClippedSubviews`.
- Why it matters: Scrolling the main screen of a social app drops frames. Combined with PERF-1, any store change also re-renders the tiles.
- Fix: Switch to FlashList v2, which is already installed. Use `React.memo(FeedTile)` with stable `onOpenPost` and `onOpenAuthor` refs. Hoist `makeStyles` to one call per theme at module or context level. Pass `active` through a memo comparator or a context keyed by id. Memoise the header. Use `recyclingKey={post.id}` on the `expo-image`.
- Effort: M

### PERF-6 · Corrupt or oversized saved state silently wipes all user data
- Severity: High
- Where: `src/store/useStore.ts:252-302`, `src/store/useStore.ts:317-328`
- What's wrong: Hydration is wrapped in `try { ... JSON.parse(raw) ... } catch {}` (`:271`, `:299`), and then `setLoaded(true)` always runs (`:300`). If parsing or reading throws, state stays `EMPTY` and `loaded` becomes true. The persist effect (`:317-327`) then writes `JSON.stringify(EMPTY)` over the stored key 500 ms later. Reads can fail on Android, where AsyncStorage rows over about 2 MB fail with "Row too big to fit into CursorWindow" and the default database cap is 6 MB. The data is one ever-growing blob holding `customRecipes`, `cookLog` (unbounded, `:741`), collections and so on. There is no schema version, no backup key and no error report.
- Why it matters: A single bad write, a truncated file or a heavy user hitting the size limit means every favourite, plan, collection and custom recipe is gone on next launch, with no trace in Sentry.
- Fix:
  - On any hydration error, do **not** enable persistence. Keep the raw string under a `.corrupt-<ts>` key, `logger.error` it, and show a recoverable message.
  - Add a `version` field with explicit migrations.
  - Split the blob into per-slice keys.
  - Cap `cookLog`.
  - For v2 (D-015 / local-first), consider SQLite (`expo-sqlite`) for user data.
- Effort: M

### PERF-7 · The hydration race can overwrite early writes, including the RevenueCat Pro entitlement
- Severity: High
- Where: `src/store/useStore.ts:285-297`, `src/pro/usePurchasesSync.ts:38-44`, `src/screens/HomeScreen.tsx:132`
- What's wrong: Hydration commits with a non-functional `setState({...EMPTY, ...parsed, entitlement: revenueCatKeyConfigured() ? EMPTY_ENTITLEMENT : ...})` (`:285`). `usePurchasesSync` runs in the same mount pass and calls `refreshEntitlement().then(apply)` → `setEntitlement(next)` (`usePurchasesSync.ts:39`). RevenueCat can answer from its on-device CustomerInfo cache in milliseconds. If that lands before AsyncStorage returns, hydration replaces the whole state and resets `entitlement` to empty. The same applies to anything else written before `loaded`.
- Why it matters: A paying user can intermittently open the app as "free" and hit the paywall until the next RevenueCat listener event. That produces support tickets and refund requests.
- Fix: Hydrate with a functional merge that keeps fields set since mount. Simpler: don't configure purchases until `store.loaded` is true, and re-run `refreshEntitlement` after hydration. In v2, keep entitlement out of persisted user state entirely (derive it from the RevenueCat SDK at runtime).
- Effort: S

### PERF-8 · Production crash reports are unreadable: source maps are never uploaded
- Severity: High
- Where: `eas.json:12`, `eas.json:24`, `eas.json:36`, `metro.config.js:11-13`, `app.json:146`, `src/lib/sentry.ts:37-57`
- What's wrong:
  - Every build profile, **including production**, sets `SENTRY_DISABLE_AUTO_UPLOAD: "true"`.
  - `metro.config.js` uses plain `getDefaultConfig`, not `getSentryExpoConfig`, so no Debug IDs are injected. The comment at `:8-10` admits this.
  - The config plugin has no `organization` or `project`.
  - There is no `sentry-expo-upload-sourcemaps` step for `eas update`, so OTA bundles have no maps either.
  - `Sentry.init` sets no `release` or `dist`, and nothing tags the `Updates.updateId`.
- Why it matters: Every JS crash in production shows up as minified `index.android.bundle:1:234567` frames. You cannot tell which screen broke, which defeats the point of having Sentry before launch.
- Fix:
  - Switch Metro to `getSentryExpoConfig(__dirname)`.
  - Add `organization` and `project` to the plugin.
  - Put `SENTRY_AUTH_TOKEN` in EAS secrets and remove `SENTRY_DISABLE_AUTO_UPLOAD` from production.
  - Run `npx sentry-expo-upload-sourcemaps dist` after every `eas update`.
  - `Sentry.setTag('expo-update-id', Updates.updateId)`.
- Effort: S

### PERF-9 · Cook-step timers are unreliable: they jump between steps and stall when the phone locks
- Severity: High
- Where: `src/components/StepText.tsx:22-30`, `src/components/StepText.tsx:50-77`, `src/pro/cookMode/CookModeModal.tsx:206`
- What's wrong:
  - Cook Mode renders only `<StepText text={steps[index]} />` (`:206`), and `TimerChip`s are keyed by segment index (`StepText.tsx:28`). When the user moves to the next step, React reuses the same chip instance whenever the new step also has a duration at that index. A running 20-minute "simmer" countdown then carries over onto the next step's "5 min" chip, because `remaining` is state and not reset by the prop change. If the new step has no chip at that index, the chip unmounts and the running timer is silently destroyed (`:57-60`).
  - The countdown is a `setInterval` decrement (`:67-77`). iOS suspends JS timers when the app is backgrounded or locked, so a timer started before locking the phone is wrong on return, and it never alerts while backgrounded.
- Why it matters: "Cook step by step" is a North Star journey. Burnt food caused by a timer that lied is exactly the kind of failure that loses users.
- Fix: Keep timers in a store keyed by `recipeId:stepIndex`, holding an absolute `endsAt`. Compute remaining time from `Date.now()`, and schedule a local notification (`expo-notifications` is already installed) at `endsAt`. Key chips by `${stepIndex}-${segIndex}`. Show running timers in a persistent tray that survives step navigation.
- Effort: M

### PERF-10 · OTA updates can crash installed apps: runtimeVersion is tied to a version that never changes
- Severity: High
- Where: `app.json:5`, `app.json:151-152`, `eas.json:4` (`"appVersionSource": "remote"`), `src/lib/queryClient.ts:8-9`
- What's wrong: `runtimeVersion.policy = "appVersion"` makes the runtime equal `expo.version`, which is `1.0.0`. With `appVersionSource: remote` and `autoIncrement`, EAS bumps only the build number, so every binary built at 1.0.0 shares one runtime. The code openly treats OTA as the release path ("ships safely over OTA on the existing TestFlight build"). As soon as a native module is added (the audit notes already propose `react-native-compressor`, NetInfo and so on) without a manual version bump, an `eas update` will load JS that calls a native module missing from older binaries. There is also no `Updates` error handling or `checkAutomatically` tuning.
- Why it matters: An immediate crash on launch for everyone on the older binary, which is the worst failure mode because users can't fix it themselves.
- Fix: Use `"runtimeVersion": { "policy": "fingerprint" }` so any native change forces a new runtime. Keep separate channels per environment (already done). Add a pre-publish check (`npx expo-updates fingerprint:generate` diff). Tag Sentry with the update id (PERF-8).
- Effort: S

### PERF-11 · Video upload loads the whole file into JS memory, uncompressed
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:425-438`, `src/data/compressMedia.ts:121-123`, `src/screens/CreatePostModal.tsx:210-214`
- What's wrong:
  - `compressVideo` is a pass-through (`return uri`).
  - Upload does `fetch(ref).then(r => r.arrayBuffer())` (`:430`), so the whole clip (up to 60 s; picker `quality: 0.7` does not apply to iOS video, which uses `videoQuality`) is held in the Hermes heap and then copied again by supabase-js.
  - `.mov` is uploaded as `video/mp4` (`:426-427`).
  - There is no poster frame, so feed tiles stream the full original.
- Why it matters: A 60 s 4K or HEVC clip can be 100 MB or more, which is likely to crash on older devices (JS out-of-memory). The feed then downloads those originals over mobile data for a 180-pt tile.
- Fix: Use `expo-file-system`'s `uploadAsync` or Supabase resumable (TUS) upload straight from the file URI. Transcode or cap resolution, generate a thumbnail with `expo-video-thumbnails`, and store `poster_url`. Show the poster in the grid and play video only on the detail screen.
- Effort: M

### PERF-12 · Feed load is a serial waterfall of three round trips over 200 rows
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:574-594`, `src/social/useFeed.ts:152-192`, `src/social/supabaseFeedAPI.ts:1037`
- What's wrong: `bites.select().limit(200)`, then `await prefetchAuthorProfiles(...in(ids))`, then (back in the hook) `await api.getLikedPostIds(viewerId, 200 ids)`. That is three sequential requests, and the likes query sends 200 UUIDs in a GET URL (about 7.5 KB). The client then shuffles and scores all 200 in JS. This is prior P2, still open.
- Why it matters: Time to first feed is roughly 3× RTT plus payload. The fixed 200-row cost grows with content, and URL length will eventually hit PostgREST or proxy limits.
- Fix: One RPC or view that returns bites joined with author profile and `liked_by_me`, keyset-paginated (the unused `feedCursor.ts` already exists), with `useInfiniteQuery`. Do ranking server-side, or rank per page.
- Effort: M

### PERF-13 · DM threads show the oldest 500 messages, render them all, and make N+1 requests
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:1133-1139`, `src/screens/ThreadModal.tsx:95-106`, `src/screens/ThreadModal.tsx:165`
- What's wrong: `getMessages` orders `created_at ascending` then `.limit(500)`, so once a thread passes 500 messages the newest never load. All messages render in a `ScrollView` with `.map` (`:95-106`). Each bubble calls `makeStyles` (`:164`) and `usePost(sharedPostId)` (`:165`), and each `getPost` does a second author request.
- Why it matters: Long conversations break outright, and opening a thread with many shared bites makes dozens of requests on the JS thread.
- Fix: Order descending, take a page, reverse on the client, and use an inverted FlashList with `onEndReached` for older pages. Batch shared posts via `getPostsByIds`. Hoist styles.
- Effort: M

### PERF-14 · Server state has no cache, no timeouts and no foreground refresh (React Query wired but unused)
- Severity: Medium
- Where: `src/lib/queryClient.ts:14-45`, `App.tsx:44`, `src/social/useFeed.ts` (all hooks), `src/lib/supabase.ts:83-116`
- What's wrong:
  - `QueryClientProvider` and `setupQueryFocus` are wired, but there are zero `useQuery` or `useMutation` calls. So `refetchOnWindowFocus`, `staleTime`, retries and de-duplication do nothing.
  - Every hook is hand-rolled `useEffect` + `setState` with an event bus.
  - Inbox, unread badge and messages only refresh on local events. There is no realtime, polling or foreground refetch, so new DMs don't appear until something local happens.
  - The Supabase client has no `global.fetch` timeout or `AbortController`, so a hung request leaves screens stuck on "Loading…".
  - The recommended React Native `AppState` → `supabase.auth.startAutoRefresh()/stopAutoRefresh()` wiring is missing (`grep startAutoRefresh src` returns nothing).
- Why it matters: Stale badges and inboxes, duplicated requests, infinite spinners on bad networks, and token-refresh failures after the app sits in the background.
- Fix: Move reads to `useQuery` and writes to `useMutation` with optimistic updates. Wrap `fetch` with a 15 s `AbortSignal.timeout`. Add the AppState auto-refresh toggle. Refetch unread counts on focus (Supabase realtime later).
- Effort: M

### PERF-15 · Crash-reporting opt-out leaks, and PII scrubbing has gaps
- Severity: Medium
- Where: `src/lib/sentry.ts:25`, `src/lib/sentry.ts:47`, `src/lib/sentry.ts:55-56`, `src/lib/sentry.ts:100-111`, `src/screens/HomeScreen.tsx:136-138`, `src/social/useFeed.ts:284`
- What's wrong:
  - `sendingEnabled` defaults to `true` and is only set from the store once HomeScreen hydrates. Launch-time crashes and errors in the first few hundred milliseconds are sent even for users who opted out.
  - `enableAutoSessionTracking: true` sends session envelopes that `beforeSend` and `beforeSendTransaction` don't filter.
  - `scrubPii` doesn't touch `exception.values[].value`, breadcrumb `message` or `request.url`. Error messages include local file URIs (`supabaseFeedAPI.ts:437,453`).
  - `logger.error(..., { query })` sends the user's typed people search (`useFeed.ts:284`).
- Why it matters: This contradicts the Settings privacy toggle and the App Privacy answers, which is a compliance risk on review and a trust risk.
- Fix: Read the opt-out flag synchronously before `Sentry.init` (small separate key, or SecureStore). If opted out, don't init (or `enabled: false`). Gate sessions. Extend scrubbing to messages and URLs. Stop logging the search query.
- Effort: S

### PERF-16 · No performance visibility: screen tracing is dead code
- Severity: Medium
- Where: `src/lib/screenTracing.ts:24-42`, `src/lib/sentry.ts:42`
- What's wrong: `startIdleNavigationSpan`, `ScreenInitialDisplay` and `ScreenFullDisplay` are defined but imported by nothing except their test. There is no navigation integration, because there is no navigation library. `tracesSampleRate: 0.1` therefore only captures the default app-start transaction. The prior audit's "TTID/TTFD wired" claim is wrong.
- Why it matters: You can't measure the jank or slow screens this audit describes, and you can't confirm whether fixes worked.
- Fix: In v2, Expo Router plus `Sentry.reactNavigationIntegration` gives per-route TTID for free. Add `TimeToFullDisplay` on Tonight, Recipe and Shopping. Track cold-start with `appStartIntegration`.
- Effort: S

### PERF-17 · Unbounded lists are rendered all at once inside ScrollViews
- Severity: Medium
- Where: `src/screens/CookmarksModal.tsx:99-137`, `src/screens/CartModal.tsx:577`, `src/screens/UserProfileModal.tsx:260`, `src/screens/PostDetailModal.tsx:340`
- What's wrong: Saved recipes and saved bites (`savedAll.map`, `bites.map`), the whole shopping list (`shopping.map`), a user's grid of up to 100 image posts (`getPostsByUser .limit(100)`, `supabaseFeedAPI.ts:811`) and all comments are mapped inside `ScrollView`s, with images, and without virtualisation.
- Why it matters: Heavy users with 100+ saves or a busy profile see slow opens and higher memory, since every image decodes at once.
- Fix: Use FlashList (or a `SectionList` for the aisle-grouped shopping list) with stable `keyExtractor`s. Paginate the profile grid and comments.
- Effort: M

### PERF-18 · The whole state is serialised synchronously on every change
- Severity: Medium
- Where: `src/store/useStore.ts:317-328`, `src/store/useStore.ts:741`
- What's wrong: The comment claims the write is debounced, and it is. But `pendingWriteRef.current = JSON.stringify(state)` runs **inside the effect on every state change** (`:319`), before the timer. So each tick, keystroke-driven `setProfile` or `recordView` stringifies the whole blob on the JS thread, including `customRecipes` and an uncapped `cookLog`. Hydration also triggers a full, redundant rewrite on every launch. There is no `AppState` background flush, so a toggle followed by a swipe-kill inside 500 ms is lost.
- Why it matters: Frame drops that grow with the user's data, plus rare lost edits.
- Fix: Stringify inside the timer callback. Flush on `AppState` → `background`. Skip the write immediately after hydration. Per-slice keys (PERF-6) shrink each write.
- Effort: S

### PERF-19 · One error boundary for the whole app, and it shows raw error text to users
- Severity: Medium
- Where: `App.tsx:59-61`, `src/components/ErrorBoundary.tsx:57-79`
- What's wrong: A single `<ErrorBoundary>` wraps `HomeScreen`, which renders every screen. A render error in any sheet (for example a malformed post in PostDetail) replaces the whole app with "Something broke" plus `error.message` (`:78`). No `onReset` is passed, so "Try again" remounts HomeScreen with the same nav-less state. Remounting also re-runs store hydration, and the unmount flush races with it.
- Why it matters: A bug in one minor screen takes down the whole app, and it shows developer text such as "Cannot read property 'x' of undefined".
- Fix: Add per-route boundaries (Expo Router's `ErrorBoundary` export per route in v2). Show friendly copy. Keep the message only in `__DEV__`. Have `onReset` pop to a safe route.
- Effort: S

### PERF-20 · Remote images are full-size, with no placeholder or transition
- Severity: Medium
- Where: `src/screens/FeedScreen.tsx:352`, `src/screens/FeedScreen.tsx:534`, `src/social/supabaseFeedAPI.ts:476`, `src/data/compressMedia.ts:40`
- What's wrong: Every tile downloads the 1,080-px original from a Supabase public URL (`getPublicUrl`, no `transform: { width }`), about 150–400 KB each × 200 posts, to fill roughly 180-pt tiles. `<Image>` has no `placeholder` (blurhash or thumbhash), no `transition`, no `recyclingKey` and no explicit `cachePolicy`. There are 41 `<Image` usages and none set these.
- Why it matters: Heavy mobile-data use, slow tile pop-in with blank grey boxes, and more decode memory.
- Fix: Request sized renditions (Supabase image transforms or pre-generated 400-px thumbs stored at upload). Store and pass a blurhash placeholder. `transition={150}`, `recyclingKey={id}`, `cachePolicy="memory-disk"`.
- Effort: M

### PERF-21 · Bundled asset weight and eager data imports (estimated)
- Severity: Medium
- Where: `src/data/recipeImages.ts:10+` (286 `require`s), `scripts/refresh-photos.ts:208-209`, `src/data/recipes.ts` (555 KB source), `src/screens/RecipeModal.tsx:34` (79 KB credits JSON), `src/screens/OnboardingModal.tsx:95`
- What's wrong: The recipe photos are produced at `resize({ width: 1200, height: 900 })` and `jpeg({ quality: 85 })`. At a typical 150–300 KB each × 286, that is an **estimated 40–80 MB** in the binary (the assets were not supplied, so this is unverified). Add `welcome-bg.mp4`. `recipes.ts` (555 KB of object literals) is imported eagerly through `useStore → data/recipes`, and the image-credits JSON is pulled in at module load of RecipeModal, so all of it is parsed before the first frame.
- Why it matters: App Store download size affects conversion. Anything over 200 MB needs Wi-Fi on cellular, and even 60–80 MB hurts. The catalogue also costs parse and allocation time at every cold start.
- Fix: Export 800-px WebP or AVIF at quality about 70 (roughly 60–90 KB each, about 20 MB total), or serve from a CDN and bundle only a small starter set. Load the catalogue as JSON via `expo-asset` or SQLite lazily, rather than a TS module in the startup path. Drop or shrink the welcome video. Measure with `npx expo export --dump-assetmap` and `npx react-native-bundle-visualizer`.
- Effort: M

### PERF-22 · Startup shows a blank screen after the splash, and the theme can flash
- Severity: Low
- Where: `src/screens/HomeScreen.tsx:377-379`, `src/themeMode.ts:24-45`, `app.json` (splash block)
- What's wrong: There is no `expo-splash-screen` `preventAutoHideAsync`. The native splash hides at the first JS frame, then HomeScreen renders an empty `View` until AsyncStorage hydrates (`:377-379`). The theme mode hydrates asynchronously after first render, so users who chose dark mode on a light system see light, then dark. No fonts are loaded; v2 plans Newsreader and Manrope, which will need this handling.
- Why it matters: A visible blank or flash on every cold start feels cheap for an "editorial, calm" brand.
- Fix: Keep the splash up until the store, theme and fonts are ready, then `hideAsync()`. Read the theme preference in the same hydration pass.
- Effort: S

### PERF-23 · Unhandled promise rejections in data hooks
- Severity: Low
- Where: `src/social/useFeed.ts:239`, `src/social/useFeed.ts:726-731`
- What's wrong: `usePost` does `api.getPost(postId).then(...)` with no `.catch`. `useBlockedState`'s `refresh()` is called without handling its rejection, and so is the `subscribeViewerChanges(refresh)` callback.
- Why it matters: Network blips become Sentry noise (unhandled rejections), and the UI sticks on stale or null state with no retry.
- Fix: Add `.catch` with a logger call, and set explicit error state. Use `useQuery` (PERF-14), which handles this.
- Effort: S

### PERF-24 · A side effect inside render: registerLocalUser runs in useMemo
- Severity: Low
- Where: `src/social/useFeed.ts:761-783`, `src/social/useFeed.ts:813`
- What's wrong: `viewerIdentityFromProfile` mutates a module-level user cache (`registerLocalUser(identity)`), and it is called inside `useMemo`. React 19 can run memos twice (Strict Mode) or discard renders.
- Why it matters: Hard-to-reproduce identity or cache inconsistencies. It also violates render purity, which future React compiler adoption relies on.
- Fix: Do the registration in an effect, or in the auth listener.
- Effort: S

### PERF-25 · Every recipe open fetches its comments twice
- Severity: Low
- Where: `src/screens/RecipeModal.tsx:453`, `src/screens/RecipeModal.tsx:530`
- What's wrong: `RecipeActionRow` and `RecipeComments` each call `useComments('recipe:<id>')` separately.
- Why it matters: Duplicate network calls on the most-opened screen.
- Fix: Lift the hook to RecipeModal and pass the result down (or use a shared `useQuery` key).
- Effort: S

### PERF-26 · A missing env var silently falls back to the simulated feed in production
- Severity: Low
- Where: `src/social/feedApi.ts:233-250`, `eas.json:31-38`
- What's wrong: If `EXPO_PUBLIC_SUPABASE_ENABLED` isn't `'1'` at build time, the app quietly uses `getLocalFeedAPI()` with seeded fake users and posts (`localFeedApi.ts:118+`). The only signal is a `logger.warn` breadcrumb when URL and key are set, and nothing at all when they're absent. The production profile in `eas.json` doesn't set these (they may be in the EAS "production" environment, which can't be verified here).
- Why it matters: A misconfigured release ships a fake social feed to real users, breaking the "No fake" rule, with no alert.
- Fix: In non-`__DEV__` builds, fail loudly (`logger.error` plus a visible error state) when social config is missing. In v1 of v2 (local-first, no social) remove the local simulated API entirely.
- Effort: S

### PERF-27 · The patch-package patch for expo-video is tied to one exact version
- Severity: Low
- Where: `patches/expo-video+3.0.16.patch`, `package.json` (`"expo-video": "~3.0.16"`, `"postinstall": "patch-package"`)
- What's wrong: The patch edits native Swift, silencing warnings and adding an `await` in `VideoModule.swift` for newer Xcode. The version range is `~`, so an `expo install --fix` or lockfile refresh to 3.0.17+ makes patch-package fail or skip on EAS.
- Why it matters: Surprise iOS build failures at release time, or behaviour drift if a hunk half-applies.
- Fix: Pin the exact version while the patch exists, add a CI check that `patch-package --error-on-fail` passes, and drop the patch when upgrading to the SDK that includes the fix.
- Effort: S

### PERF-28 · Uploads leave orphaned files and encode photos twice
- Severity: Low
- Where: `src/social/supabaseFeedAPI.ts:1227-1232`, `src/social/supabaseFeedAPI.ts:1262-1266`, `src/social/supabaseFeedAPI.ts:445-449`
- What's wrong: Media is uploaded one after another (sequential `await` in a `for` loop). If a later upload or the `bites` insert fails, the already-uploaded files are never deleted. Photos already JPEG-compressed to 0.7 in `compressPhoto` are re-encoded at 0.9 via base64 in JS (`manipulateAsync(..., { base64: true, compress: 0.9 })`) before upload, which roughly triples the memory for the encoded string.
- Why it matters: Storage cost grows from orphans, posting is slower, and there are memory spikes on multi-photo posts.
- Fix: Upload in parallel from the file URI (no base64), and delete uploaded paths in a `catch`. Skip the second re-encode.
- Effort: S

### PERF-29 · A slower, older feed response can overwrite a newer one
- Severity: Low
- Where: `src/social/useFeed.ts:152-214`
- What's wrong: `load` only checks `mountedRef`, not whether it is still the latest request. When `viewerId` changes (the auth uid resolves after first render, as documented at `:791-799`) or `bumpFeed` fires mid-request, the earlier (signed-out) request can resolve last and overwrite the newer feed and `likedPostIds`.
- Why it matters: Wrong hearts or a wrong feed right after sign-in, which is hard to reproduce.
- Fix: Use a request counter or `AbortController` per load and ignore stale results. `useQuery` keyed on `viewerId` does this automatically.
- Effort: S

---

## Notes for the v2 rebuild (no action on the old app implied)
- PERF-1, 2, 3, 4, 14 and 16 all come from one architectural choice: render every screen always and hand-roll navigation and fetching. Expo Router (already the v2 convention), a selector store and TanStack Query remove them structurally.
- PERF-6, 7 and 18 argue for per-slice persistence with a schema version, and for the entitlement never living in persisted user state.
- PERF-9 is directly on the North Star "Cook" loop. Design timers as absolute-deadline domain logic (pure, in `src/domain`) with a local notification.
- Verified as fine: all `Animated` calls use `useNativeDriver: true` (23 uses, none false). Keyboard, BackHandler and AppState listeners are all removed on cleanup. Cook Mode's keep-awake is scoped to `visible`. The `document`/`window` web hacks are all behind `Platform.OS === 'web'` or `typeof window` guards.
