# Quality audit: code, design system, accessibility, copy, tests (old app)

Source: `/home/claude/old-audit` (read-only). Every count comes from a grep or script run over `src/` with `__tests__` excluded unless stated otherwise.

**Environment caveat:** `node_modules` is not installed in the audit copy, so `npx tsc --noEmit` shows 4,881 errors here, all driven by TS2307 "cannot find module". The strict-flag deltas in QUAL-6 are measured against that baseline. Unresolved modules are typed `any`, so treat the deltas as lower bounds.

---

## A. Code quality

### QUAL-1 · Real fake data in production: simulated users in People search, synthesised notifications
- Severity: Critical
- Where: src/screens/BrowseModal.tsx:29, :195-204; src/social/notifications.ts:22, :49-110, :233-235; src/social/simulatedData.ts (720 lines)
- What's wrong: The Browse "People" search filters `SIMULATED_USERS` without checking any condition, even in cloud mode, so real users search a hard-coded list of fake cooks. In local mode, `useNotifications` returns invented follow and like events ("Deterministic 'minutes ago' set so the list looks fresh", notifications.ts:40-41). The fake avatars are emoji (simulatedData.ts:26-125).
- Why it matters: A reviewer or user who sees fake people and fake likes will lose trust, and App Review can reject for it. It also breaks the v2 rule "No fake, no dead".
- Fix: Delete `simulatedData.ts` and the local notification synthesiser. People search goes through `FeedAPI.searchUsers`. When there is no backend, show a designed "Social is off" empty state.
- Effort: S

### QUAL-2 · God-files: 32 files over 400 lines, 40 over 300
- Severity: High
- Where: `find src -name '*.ts*' -not -path '*__tests__*' | xargs wc -l | awk '$1>400'`
  - src/data/recipes.ts 14,357
  - src/screens/PantryModal.tsx 1,696
  - src/social/supabaseFeedAPI.ts 1,490
  - src/screens/RecipeModal.tsx 1,375
  - src/screens/CreatePostModal.tsx 1,265
  - src/screens/CartModal.tsx 1,190
  - src/screens/BrowseModal.tsx 1,189
  - src/screens/SpinnerModal.tsx 1,150
  - src/screens/OnboardingModal.tsx 1,082
  - src/screens/SignInScreen.tsx 966
  - src/screens/HomeScreen.tsx 956
  - src/store/useStore.ts 924
  - src/screens/FeedScreen.tsx 907
  - src/social/localFeedApi.ts 870
  - src/social/useFeed.ts 814
  - src/social/simulatedData.ts 720
  - src/screens/SettingsModal.tsx 697
  - src/screens/CollectionsModal.tsx 671
  - src/screens/UserProfileModal.tsx 664
  - src/pro/cookMode/CookModeModal.tsx 647
  - src/screens/PostDetailModal.tsx 627
  - src/components/RecipeBody.tsx 614
  - src/screens/RecipeEditorModal.tsx 610
  - src/screens/PaywallModal.tsx 514
  - src/screens/ProfileModal.tsx 513
  - src/screens/InboxModal.tsx 513
  - src/screens/PostRecipeModal.tsx 505
  - src/data/nutrition/ingredients.ts 494
  - src/screens/CookmarksModal.tsx 433
  - src/data/ingredients.ts 405
  - src/screens/ProfileSetupModal.tsx 404
  - src/screens/SideDrawer.tsx 403
  
  Screens also define 77 local function components in-file (`grep -hcE "^function [A-Z]\w*\(" src/screens/*.tsx`). Examples: CartModal.tsx:632 `MealCard`, which shadows components/MealCard; `SectionHeader` is defined separately in FeedScreen:394, PantryModal:878 and BrowseModal:546; `EmptyState` in CollectionsModal:379 and CookmarksModal:246; `Stat` in UserProfileModal:355 and StatsModal:151.
- Why it matters: Nobody can review or safely change a 1,700-line screen, and the copied sub-components drift apart visually.
- Fix: v2 keeps the 300-line cap. Put recipe content in JSON (already planned, D-014). Keep shared primitives (SectionHeader, EmptyState, Stat, Card) in one `ui/` folder, with screens composing them.
- Effort: L

### QUAL-3 · No navigation library: 33 always-mounted modals orchestrated from HomeScreen
- Severity: High
- Where: src/screens/HomeScreen.tsx:66-100 (the comment "The app has no navigation library. Instead every screen is a native <Modal>"), mounts at :400-945; `grep -rn "<Modal\b" src --include=*.tsx` gives 50 uses across 40 files.
- What's wrong: HomeScreen keeps every screen mounted all the time and hand-rolls a stack. Post and user screens get "three instances" each to fake recursion. There is no deep linking, no platform back gesture semantics and no route-level testability.
- Why it matters: This is slow to start and memory heavy. It also produces the stacked-modal bugs the file comments describe (ModalSafeArea.tsx:7-14) and blocks Maestro deep-link setup.
- Fix: v2 uses Expo Router with thin route files (already the plan). Sheets become real sheets and screens become routes.
- Effort: L (done by the rebuild)

### QUAL-4 · Two parallel grocery pipelines; the tested one is dead
- Severity: High
- Where: src/data/groceryConsolidate.ts:159 `consolidate` is imported only by src/data/shareCart.ts:12, which nothing imports. CartModal.tsx:24-25 uses `groceryNormalise.buildGroceryList` and `groceryAisles.groupByAisle` instead.
- What's wrong: Two ingredient-merging implementations exist. One has tests (groceryConsolidate.test.ts) and ships nothing. The other ships and has thinner tests (groceryNormalise.test.ts, 55 lines).
- Why it matters: Merging the shopping list is the North Star feature. Tests that pass on dead code give false confidence.
- Fix: One pure `domain/shopping` module derived from the plan, with golden tests on real recipes. Delete the other.
- Effort: M

### QUAL-5 · Dead code: 6 unimported files and 15 unused exports
- Severity: Medium
- Where:
  - Unimported files: src/components/Reel.tsx (131 lines), src/components/SpinButton.tsx (74), src/data/shareCart.ts (42), src/screens/NotificationsModal.tsx (225). src/social/feedCursor.ts and src/lib/screenTracing.ts are imported only by tests.
  - Unused exports: a11y.ts:43 `getHighContrast`, themeMode.ts:55 `getThemeMode`, StepText.tsx:177 `__test`, localFeedApi.ts:788 `readViewerStateSync`, localFeedApi.ts:802 `getFollowsBySource`, notifications.ts:113 `unreadNotificationCount`, types.ts:87 `ViewerSocialState`, season.ts:19 `SEASON_LABELS`, logger.ts:56 `isInitialized`, supabase.ts:166 `__resetSupabaseClientForTests`.
  - BrowseModal.tsx:63-78 defines an `emoji` on every QuickChip that is never rendered.
  - The repo root holds a stale native project folder `The Hub/` (Xcode project, 428 KB).
- Why it matters: Dead code misleads readers and future Claude sessions. It also inflates the audit surface.
- Fix: Add `knip` or `ts-prune` to CI and fail on unused files and exports.
- Effort: S

### QUAL-6 · tsconfig only turns on `strict`; the safer flags are missing
- Severity: Medium
- Where: tsconfig.json:3-5 (`"strict": true` only)
- What's wrong: These flags are off: `noUncheckedIndexedAccess` (+159 errors when enabled), `exactOptionalPropertyTypes` (+45), `noUnusedLocals` and `noUnusedParameters` (+4), and `noImplicitReturns`, `noFallthroughCasesInSwitch` and `noImplicitOverride` (+2). The +159 hides real crash paths, for example `(display?.name || '?')[0].toUpperCase()` at UserProfileModal.tsx:178 and FollowListModal.tsx:79, `picked.assets[0].uri` at PantryScanFlow.tsx:115, and `MONTH_SHORT[...]` at CartModal.tsx:396.
- Why it matters: Indexed access is the most common source of "undefined is not an object" crashes in RN.
- Fix: For v2, turn on all of these on day one, while the codebase is empty.
- Effort: S (v2) / M (retrofit)

### QUAL-7 · `any` escapes and unchecked casts
- Severity: Medium
- Where: 20 `any` sites (`grep -rnE ": any\b|as any\b|<any>"`), including:
  - BrowseModal.tsx:453-455 and :522-523: `renderItem: any`, `columnWrapperStyle: any`, `listData as any[]`, `(item: any)`
  - CartModal.tsx:74 and :114: `{} as any` to build Records
  - SettingsModal.tsx:514: `const Wrapper: any`
  - FeedScreen.tsx:131: `f.meal as any`
  - CollectionsModal.tsx:353: `width as any`
  - pro/ai/client.ts:123: `let payload: any`
  - lib/sentry.ts:100: `scrubPii(event: any): any`
  - six `(navigator as any)` web shims in RecipeActionsSheet:70 and :95, RecipeModal:460, PostMenuSheet:60-61, CartModal:232, StepText:91
  
  Also: one `@ts-ignore` at src/push/pushClient.ts:86, 67 `as <Type>` assertions, and 16 `eslint-disable-next-line react-hooks/exhaustive-deps`, for example RecipeModal.tsx:139, CartModal.tsx:211, useFeed.ts:197 and :812.
  
  The persisted store is spread straight from `JSON.parse` with no validation (useStore.ts:270-297), and a bare `catch {}` at :298 silently drops a corrupt save.
- Why it matters: The type system can't catch errors in the places most likely to break: list rendering, storage migration and the AI proxy payload. A silent catch on load means a corrupt save wipes the user's plan with no signal.
- Fix: Ban `any` with a lint error. Write one typed `share()` platform helper. Validate persisted state with a hand-written guard in `src/domain` (no packages, D-015), and log plus keep a backup on parse failure.
- Effort: M

### QUAL-8 · Copy-pasted helpers
- Severity: Low
- Where:
  - `function cap(s)` defined six times: CartModal.tsx:85, SettingsModal.tsx:465, PostDetailModal.tsx:417, SpinnerModal.tsx:728, CollectionsModal.tsx:394, CookmarksModal.tsx:261
  - inline capitalisation repeated at HomeScreen.tsx:884, CartModal.tsx:143, :262, :461 and RecipeBody.tsx:255
  - initial-letter avatar fallback repeated at Masthead.tsx:68, PostMenuSheet.tsx:128, UserProfileModal.tsx:178, FollowListModal.tsx:79
  - `Share.share` or navigator.share branches written separately in 6 files
- Why it matters: Small drift and more places to fix a bug.
- Fix: Put `formatLabel`, `initialOf` and `share` in `src/domain` or `src/lib` and import them everywhere.
- Effort: S

### QUAL-9 · Legacy naming and storage keys (Hub, dinner-spinner, Cookmarks, Meal vs Recipe)
- Severity: Low
- Where:
  - Storage keys: useStore.ts:106-108 `LEGACY_KEYS = ['the-hub/v1','dinner-spinner/v1']`, themeMode.ts:14, localFeedApi.ts:32
  - `Meal` (212 refs) and `Recipe` (231 refs) are both used for the same dish concept
  - Route key `favorites` is labelled "Cookmarks" at SideDrawer.tsx:130; the store method is `toggleFavorite`
  - The toolbar tab is `plan` but the route is `cart` (HomeScreen.tsx:227)
  - The drawer label `pantry` shows as "Cupboard" (SideDrawer.tsx:123)
- Why it matters: Internal names that don't match the UI cause wrong-feature bugs and slow onboarding.
- Fix: v2 glossary in DECISIONS: one noun per concept (Recipe, Saved, Plan, Shopping list, Cupboard), used in code and copy alike.
- Effort: S

### QUAL-10 · Comments are used as a changelog
- Severity: Low
- Where: 45 comments that narrate history (`grep -rnE "//.*\b(was [0-9#'\"]|previously|used to|Previously|HISTORY|audit|...)"`), for example Toolbar.tsx:189 "Shorter gradient (was 140)", ModalSafeArea.tsx:7 "HISTORY — this used to…", PantryModal.tsx:728 and :1035 "replaces the older emoji-glyph aesthetic". There are 5,362 comment lines in total. Genuinely commented-out code: none found. TODO/FIXME: SpinnerModal.tsx:66 and :104 (cupboard state not lifted), supabaseFeedAPI.ts:579 ARCH-TODO (fetch-all feed, no pagination), feedCursor.ts:16, queryClient.ts:34.
- Why it matters: History belongs in git. Comments like these go stale and bury the "why".
- Fix: Keep "why" comments only. The two SpinnerModal TODOs are real product gaps: Surprise me can't see the cupboard.
- Effort: S

### QUAL-11 · Logging and console hygiene
- Severity: Low
- Where: The only raw `console.*` calls are in lib/logger.ts:62-94 (dev-gated) and supabase.ts:53 (`__DEV__`).
- What's wrong: Nothing serious. This is a positive finding. Log calls pass internal context strings such as "SupabaseFeedAPI/createPost: bite_images insert failed". Those are fine for logs but get reused in user alerts (see QUAL-27).
- Fix: Keep the logger pattern in v2.
- Effort: S

---

## B. Design system

### QUAL-12 · The token system covers colour only; type, spacing and radius are all literals
- Severity: High
- Where: src/theme.ts:15-21. `SHARED` holds only `rowH` and four radii. There are no spacing or type-scale tokens, and the sans face is the system default (theme.ts:4-7).
- What's wrong:
  - **695 `fontSize` literals with 36 distinct sizes**, including 9, 9.5, 10, 10.5, 11.5, 12.5, 13.5 and 14.5.
  - 1,397 padding/margin literals.
  - 211 `borderRadius` literals across 34 distinct values; the radius tokens are used only 46 times.
  - 34 distinct `letterSpacing` values.
  - Weights: 235 × '700', 164 × '800', 117 × '600', 1 × '900'.
- Why it matters: This is the main reason the app reads as assembled rather than designed: nothing snaps to a scale.
- Fix: v2 `src/ui/tokens` gets a type scale of about 7 steps (Newsreader for display, Manrope for UI), a 4-pt spacing scale, 3 radii and 2 elevation levels. The lint rule bans numeric literals for these props outside tokens (already a v2 rule). Add a token test.
- Effort: M

### QUAL-13 · 168 hard-coded hex colours and 104 rgba literals outside the theme
- Severity: High
- Where: `grep -rnoE "#[0-9A-Fa-f]{3,8}\b"` finds 168 outside theme.ts and recipes.ts. Worst files: PantryModal.tsx (25), data/cuisineColors.ts (24), OnboardingModal.tsx (19), SignInScreen.tsx (13), CollectionsModal.tsx (8). Examples:
  - PantryModal.tsx:88-106: a private `CAT_PALETTE` of 24 pastels plus `CHIP_INK`, not theme-aware, so it shows as bright pastel blocks in dark mode
  - SignInScreen.tsx:67-76: a private palette including `BRAND_GREEN '#3fb86c'`, with the screen locked to `DARK_THEME` (:113, :466)
  - OnboardingModal.tsx: `'#FFFFFF'` repeated 17 times, e.g. :706, :730, :967 (`'#000'`)
  - theme.ts:196-223: `CUISINE_COLORS`, `DIET_COLORS` and `MEAL_TYPE_COLORS` are built from `LIGHT_THEME` only, so dark mode gets light pastels
- Why it matters: Dark mode and high contrast can't reach these colours. Each screen ends up with its own palette, which is the "patchwork" look.
- Fix: Every colour becomes a semantic token (surface, text, accent, category.n) with light and dark values. Ban hex literals outside tokens with lint.
- Effort: M

### QUAL-14 · Two competing cuisine colour systems, with green in the brand
- Severity: Medium
- Where: theme.ts:196 `CUISINE_COLORS` (bg/ink pastel pairs, used by MealRow, MealCard, ResultDetail, MealPickerSheet, FiltersModal) vs data/cuisineColors.ts:11-28 `CUISINE_EYEBROW` (saturated hex, "tuned for dark backgrounds", used by 8 screens including CartModal, BrowseModal, PantryModal). Greens: '#3D9C6E', '#4FAA72', '#3D9E82', PantryModal '#006c28', SignIn '#3fb86c'.
- Why it matters: The same cuisine shows in two different colours depending on the screen. v2 rules out green.
- Fix: One category-colour token set in v2, or drop cuisine colour entirely and let typography do the work, which is the more editorial choice.
- Effort: S

### QUAL-15 · Emoji and Unicode glyphs used as UI icons, mixed with Ionicons
- Severity: High
- Where: 274 emoji characters in 15 non-test files (python scan, U+1F300-1FAFF and U+2600-27BF). The UI-facing ones:
  - RecipeActionsSheet.tsx:131-172 uses glyphs as the action icons: "◷", "✓"/"+", "🔖" (the same glyph for both states, :145), "❏", "↗", "✉", "⌕"
  - ✕ close buttons as text: MealPickerSheet.tsx:65, SendToSheet.tsx:93, ComposeMessageSheet.tsx:75
  - MealRow.tsx:65 "⊘"/"◯"
  - StepText.tsx:113 "⏸" and :116 "Done ✓"
  - OnboardingModal.tsx:237 "✓" and :590 `{meal.emoji}` on the reveal cards
  - ProfileSetupModal.tsx:28 and :267-277: an emoji avatar picker (🍳🥘🍜…🔥🫕), with `EMPTY_PROFILE.avatarEmoji: '🍳'` at useStore.ts:102
  - UserProfileModal.tsx:178 and FollowListModal.tsx:79 render `avatarEmoji`
  - data/meals.ts:51-89: emoji picked by regex over the dish name
  - data/ingredients.ts: 199 emoji, fed into the PantryModal "unlocks" data at :243 and :714
  - FirstRunChecklist.tsx:116 'START →' / 'OPEN →', and "See all →" in Browse, Feed and Pantry
  
  Meanwhile 191 `<Ionicons>` uses make up the main icon system.
- Why it matters: Emoji icons and avatars are the strongest "AI-built or cheap" tell. They render differently across OS versions and read badly with VoiceOver ("bookmark emoji").
- Fix: Use one icon set (a single weight of a line-icon family), no emoji anywhere in the UI (already a v2 brand rule), and a monogram avatar fallback. Add a lint rule or test that fails on emoji code points in `src/`.
- Effort: S

### QUAL-16 · Gradients on 17 surfaces and 74 shadow declarations
- Severity: Medium
- Where: `<LinearGradient` at Toolbar.tsx:73, Reel.tsx:75 and :80, FeedScreen.tsx:358, OnboardingModal.tsx:201, :206, :264, :553 and :640, SignInScreen.tsx:484, SpinnerModal.tsx:359, :365 and :695, PantryModal.tsx:926, BrowseModal.tsx:598 and :629, RecipeModal.tsx:191. There are 74 `shadow*`/`elevation` declarations (`grep -rnE "shadow(Opacity|Radius|Color)|elevation:"`). `borderRadius: 999` appears 90 times (pill everything).
- Why it matters: Hero scrims over photos, pill-shaped everything and soft shadows are the generic template look. They don't fit a "calm, editorial" brief.
- Fix: Allow at most one scrim token for text-on-photo. Replace shadows with hairline rules and surface contrast. Reserve pills for chips.
- Effort: S

### QUAL-17 · Components that do the same job are rebuilt per screen
- Severity: High
- Where:
  - components/Chip.tsx is used by 1 file, while there are 53 locally defined `*Chip*` styles.
  - There are 145 locally defined `*Btn/*Button/*Cta` styles; `primaryBtn` alone is redefined in 6 files.
  - Sheets are built three ways: BottomSheet (15 users), ScreenModal (35 users), and raw `<Modal>` + backdrop in FilterDropdown.tsx:66, SendToSheet, ComposeMessageSheet and MealPickerSheet (each with its own `closeBtn` at 36 or 40 pt).
  - Confirmations use 80 `Alert.alert` calls mixed with custom sheets and `window.alert` at HomeScreen.tsx:710.
  - components/Badge.tsx is used by 1 file.
- Why it matters: The button, chip and sheet look slightly different on every screen. That inconsistency is what users read as "not professional".
- Fix: Build a v2 primitive set (Button in 3 variants, Chip, Sheet, ListRow, SectionHeader, EmptyState, ConfirmDialog, IconButton) with Storybook-style screenshots, and add a lint ban on raw `Pressable` in features.
- Effort: M

### QUAL-18 · 120 of 285 recipe photos are AI-generated, and the app labels them
- Severity: High
- Where: src/data/recipeImageCredits.json (source counts: pexels 165, ai-generated 120); RecipeModal.tsx:52-58 and :316-318 render "AI-generated photo".
- Why it matters: This is the most literal "looks AI-generated" problem there is. The label is honest, but it tells users that 42% of the catalogue's hero images aren't real food.
- Fix: For v2, commission or license real photography for launch recipes. Otherwise ship typographic cards with no photo rather than AI images. Record the decision in DECISIONS.
- Effort: L

---

## C. Accessibility

### QUAL-19 · Most Pressables have no role; 192 of 293 have no accessibilityLabel
- Severity: High
- Where: The script found 293 `<Pressable>`; 260 have no `accessibilityRole` and 192 have no `accessibilityLabel`. Many take their name from child text, but 13 are icon-only with no name at all:
  - PostDetailModal.tsx:265, :270 and :275 (send, cart, calendar)
  - SignInScreen.tsx:490 (back)
  - UserProfileModal.tsx:155 (more menu)
  - PantryModal.tsx:590
  - CreatePostModal.tsx:320, :348, :645, :655, :806 and :809 (stepper −/+)
  - BrowseModal.tsx:267 (clear search)
  
  Across the app there are only 12 `accessibilityState` uses, 0 `accessibilityHint`, 1 `accessibilityRole="header"` and 1 `accessibilityViewIsModal`. components/Chip.tsx:18 exposes no selected state, so filter chips (53 chip styles) don't announce on or off.
- Why it matters: VoiceOver users hear "button" with no name, or just the text with no role. Selection state is visual only. Modals don't trap focus, so VoiceOver can wander into the screen underneath.
- Fix: v2 primitives require a `label` prop in the type (a compile error without it), set the role by default, and set `accessibilityState` for toggles. Screen headers get `role="header"`. Sheets set `accessibilityViewIsModal`. Add a jest test that walks rendered trees for unlabelled touchables.
- Effort: M

### QUAL-20 · Key text/background pairs fail WCAG AA
- Severity: High
- Where: Computed contrast ratios; the WCAG AA threshold is 4.5:1 for body text and 3:1 for large text.

  | Pair | Ratio | Result |
  |---|---|---|
  | ink #1A1A1A / bg #FFF | 17.4 | pass |
  | inkSoft #4A4A4A / bg | 8.86 | pass |
  | inkMuted #6E6E6E / bg | 5.10 | pass |
  | inkMuted / bgSoft #F7F7F7 | 4.76 | pass |
  | inkMuted / cardAlt #F4F4F4 | 4.64 | pass |
  | **inkSubtle #BCBCBC / bg** | **1.90** | fail; used as text colour 31 times, e.g. RecipeBody.tsx:438, MealRow.tsx:122, CookModeModal.tsx:432, PantryModal.tsx:1388 and :1673, RecipeModal.tsx:1169, SpinnerModal.tsx:777 |
  | **accent #C99155 / bg** | **2.74** | fail; accent used as text colour 45 times, e.g. RecipeBody.tsx:399 and :471, MealRow.tsx:125 |
  | **white / accent** | **2.74** | fail for CTA labels on the accent fill |
  | accentDeep #A2723D / bg | 4.19 | fails body text |
  | accentDeep / accentSoft | 3.63 | fails body text |
  | **danger #D85A5A / bg** | **3.80** | fails body text; used as text 12 times |
  | Dark: inkSubtle #48484A / bg #0A0A0A | 2.17 | fail |
  | Dark: all other main pairs | ≥ 5.6 | pass |
  | Cuisine eyebrows on white (e.g. #4FAA72 2.87, #B89247 2.90, #B88E47 3.00, #3D9E82 3.28) | < 3.4 | fail at 10-11 pt |
  | CUISINE_COLORS inks on the dark card #141414 (always light-palette, see QUAL-13) | 2.57-3.31 | fail |
  | SignIn TEXT_FAINT #5e5a52 on #0A0A0A (placeholder, legal copy) | 2.89 | fail; SignInScreen.tsx:69, :646, :785, :950 |
  | PantryModal `soft` on `tint` | 2.29-2.35 | fail |
  
  src/__tests__/theme.test.ts only asserts hex literals and has no contrast test.
- Why it matters: Secondary info, prices, eyebrows and legal copy are unreadable for low-vision users and in sunlight in the kitchen.
- Fix: v2 token test: compute contrast for every declared text/surface pair in both themes and fail below 4.5:1 (3:1 for ≥ 18 pt). Darken the light accent to about #8A5A22 (already the high-contrast value) for text use.
- Effort: S

### QUAL-21 · No Dynamic Type strategy; text goes down to 9 pt
- Severity: High
- Where: 0 `allowFontScaling`/`maxFontSizeMultiplier` and 0 `adjustsFontSizeToFit`. Text below 11 pt appears 46 times (23 × 10, 9 × 9.5, 8 × 10.5, 6 × 9), e.g. RecipeBody.tsx:457 (9), CookModeModal.tsx:629 (9) and :378 (9.5), CartModal.tsx:1010 (9.5), SpinnerModal.tsx:885. There are 104 `numberOfLines` truncations and fixed row heights (`rowH: 64`, theme.ts:16).
- Why it matters: Scaling is on by default, so at the larger accessibility sizes fixed-height pills and rows clip or overlap. At the default size, 9-10 pt uppercase eyebrows are below comfortable reading size, and Cook Mode is read from arm's length.
- Fix: Minimum 12 pt (Cook Mode body ≥ 20 pt). Set `maxFontSizeMultiplier` per token (for example 1.6 for body, 1.2 for chrome labels). No fixed heights on text containers (minHeight only). Add a Maestro run at the largest accessibility size.
- Effort: M

### QUAL-22 · Touch targets under 44 pt without compensation
- Severity: Medium
- Where: The script found 35 control styles with width or height under 44. Some have `hitSlop` (111 uses across the app). These have **none**:
  - RecipeEditorModal.tsx:238 `iconRemoveBtn` (28×28, :517)
  - CreatePostModal.tsx:692 and :751 `stepRemoveBtn` (26×26, :1069)
  - CreatePostModal.tsx:806 and :809 `stepperBtn` (28×28 with hitSlop 4, giving 36, :1157)
  - PantryModal.tsx:1250 `jarChipX` (16×16 visual)
  - SendToSheet.tsx:216, ComposeMessageSheet.tsx:137 and MealPickerSheet.tsx:143 `closeBtn` (36×36)
  - CookModeModal.tsx:356 and :364 (36 and 38 pt, on the screen used with wet hands)
- Why it matters: Missed taps, especially in Cook Mode and editors.
- Fix: The IconButton primitive enforces a 44×44 hit area. Cook Mode controls are ≥ 56 pt.
- Effort: S

### QUAL-23 · Reduce Motion is honoured in only one place
- Severity: Medium
- Where: `isReduceMotionEnabled` appears only in SpinnerModal.tsx:144-151. Animated sequences that ignore it: Toolbar.tsx, ScreenModal.tsx, Toast.tsx, BottomSheet.tsx, SideDrawer.tsx, Reel.tsx and SpinButton.tsx (the last two are dead). There are 20 hard-coded `duration:` literals (220 ×7, 200 ×4, 140 ×3, 600, 400…).
- Why it matters: This is an Apple accessibility expectation, and v2 calls for "restrained motion".
- Fix: A `useReducedMotion()` hook in `ui/`, plus motion tokens (duration.fast/base, easing.standard) that collapse to 0 when reduced.
- Effort: S

### QUAL-24 · Screen-reader order and semantics
- Severity: Medium
- Where: Every screen is a stacked `<Modal>` (QUAL-3), and only 1 sets `accessibilityViewIsModal`. The Toolbar floats over content (Toolbar.tsx:68-80, a gradient overlay). Only 2 uses of `accessibilityLiveRegion` or announce, so toasts (Toast.tsx) aren't announced.
- Why it matters: VoiceOver can move focus behind the top modal, and success or error feedback is silent.
- Fix: v2 router screens and sheets set modal semantics. Toast calls `AccessibilityInfo.announceForAccessibility`.
- Effort: S

---

## D. Copy and UX

### QUAL-25 · The same things have 3-4 names
- Severity: High
- Where:
  - **Saved items:** "Cookmarks" (SideDrawer.tsx:130; PostDetailModal "Save to Cookmarks" / "Remove from Cookmarks"), "Saved" (CookmarksModal.tsx:109 page title), "Remove from saved" (RecipeActionsSheet.tsx:146), "Saved bites" (SavedPostsModal.tsx:49), "favourites" (CollectionsModal delete dialog: "Recipes in this collection stay in your favourites").
  - **Shopping:** "Plan" tab (SideDrawer.tsx:138, Toolbar), "Shopping list" (CartModal.tsx:342), "grocery list" (RecipeActionsSheet.tsx:140; HomeScreen.tsx:516, :520 toasts), `cart` in code.
  - **Pantry:** "Cupboard" (Toolbar.tsx:119, SideDrawer.tsx:123) vs "Pantry" filter (SpinnerModal.tsx:306, :415) vs "pantry staples" (PantryModal.tsx:628) vs the app name "The Pantry".
  - **Social posts:** "bite" (Toolbar "Share a bite", PostMenuSheet) vs "post" (PostDetailModal "Post unavailable", PostRecipeModal:247 "This post doesn't…", UserProfileModal:247 "post a dish").
  - **Random pick:** "Spinner" (SideDrawer.tsx:137) vs "Surprise me" (SpinnerModal).
- Why it matters: Users can't build a mental model. It reads as copy written by several authors (or prompts).
- Fix: A v2 glossary (Saved, Plan, Shopping list, Cupboard, Surprise me) in PRODUCT.md, plus a copy test that greps for banned synonyms.
- Effort: S

### QUAL-26 · American spelling and date formats in an Australian app
- Severity: Medium
- Where:
  - BrowseModal.tsx:94 "Cozy night in" (should be Cosy)
  - CartModal.tsx:83 and :396 render dates as `Oct 5` (US order) instead of `5 Oct`
  - CreatePostModal.tsx:59 cuisine label 'Middle East' vs 'Middle Eastern' elsewhere
  - pro/ai/identifyIngredients.ts:56 and :107 AI prompt examples "Greek yogurt", "Ground beef/pork" (AU: yoghurt, mince), so scan results come back in US terms
  - Code identifiers mix `favorite` (97 refs) and `normalise`
  - UI copy is otherwise mostly AU (57 AU spellings found)
- Why it matters: Small errors like these signal a generic, imported product to an Australian audience.
- Fix: Set the en-AU locale for all `Intl` date formatting. Add a spelling lint list (cozy, color, favorite, yogurt, ground beef).
- Effort: S

### QUAL-27 · Raw technical errors shown to users; a dead "Forgot password"
- Severity: High
- Where:
  - socialLogin.ts:216 `Sign-in failed: ${error.message}`
  - supabaseFeedAPI.ts:1413 `Account deletion failed: ${error.message}`, surfaced by HomeScreen.tsx:708-712
  - PantryScanFlow.tsx:117 and :137 `err.message`
  - PostMenuSheet.tsx:110 `Couldn't delete the bite\n\n${msg}`
  - ErrorBoundary.tsx:76-78 shows "Something broke" plus the raw `error.message`
  - SignInScreen.tsx:379-380 "Forgot password" opens "Reset-password flow is queued — for now, please contact support." (a dead feature)
  - SignInScreen.tsx:200 "Click it" (mobile: tap)
  - CreatePostModal.tsx:361-377: in release builds the disabled Share button does nothing when tapped, with no explanation. The explanation exists only under `__DEV__`, and it contains the string "Unknown reason — tell Claude."
- Why it matters: Supabase and JS error strings look broken and unprofessional. A button that leads nowhere breaks "no dead buttons".
- Fix: Map errors to plain, actionable copy (what happened, what to do). Log the raw error to Sentry only. A disabled button shows inline reasons. Ship password reset, or remove the button.
- Effort: S

### QUAL-28 · Tone: stock or gamified copy and inconsistent punctuation
- Severity: Low
- Where:
  - FirstRunChecklist.tsx:70 "Get your first win" and :72 "Keep going — you're almost cooking."
  - OnboardingModal.tsx:436 "Bring on the challenge", :499 "there are no wrong answers", :620 "These look great"
  - PaywallModal.tsx:103 "Welcome to Pantry Pro!"
  - ProfileSetupModal.tsx:199 "You're all set!"
  - PantryModal.tsx:708 "UNLOCK MORE"
  - BrowseModal mood rails "Impress guests", "Weekend project"
  - Apostrophes: 34 straight vs 11 curly in the extracted copy (e.g. PostMenuSheet.tsx:88 "won't" vs FirstRunChecklist "you’re")
  - ALL-CAPS eyebrows everywhere ("YOUR MENU'S READY", "TONIGHT, YOU'RE HAVING", "WHY THIS")
  - Only 3 exclamation marks, which is a good sign
- Why it matters: The tone drifts between an editorial voice and SaaS onboarding, and the gamified bits read as template copy.
- Fix: A v2 voice guide (calm, specific, no exclamation marks, curly quotes via a lint rule). Sentence-case eyebrows with letter-spacing come from tokens, not literal caps.
- Effort: S

### QUAL-29 · Empty states: present but inconsistent
- Severity: Low
- Where: About 20 empty-state strings exist. Positives: CookmarksModal.tsx:122, CollectionsModal.tsx:225, StatsModal.tsx:93. Problems:
  - two generic "Nothing here yet" (FeedScreen.tsx:308, FilteredMealsModal.tsx:101)
  - CollectionsModal instructions reference the "⋯ menu" glyph
  - CartModal empty states go through toasts ("Shopping list is empty — plan a meal first.", CartModal.tsx:268, :279) rather than inline designed states
  - RecipeModal.tsx:339 "NO RECIPE YET"
  - the loading state on the Feed is just "Loading feed…"
- Why it matters: Empty screens are the first thing a new local-first user sees in v1.
- Fix: One EmptyState primitive (title, one line, one action). Every screen brief lists its loading, empty and error states (already a v2 rule).
- Effort: S

---

## E. Tests

### QUAL-30 · Zero UI or component tests: none of the 41 screens or 21 components are rendered in a test
- Severity: Critical
- Where: 36 suites / 358 `it(` blocks; only 2 files use `render`/`renderHook` (useStore.test.ts, useFeed.test.tsx), and both are hook-only. The only tests under components/__tests__ are stepDuration.test.ts (pure). `grep -rn testID src` gives **0** testIDs. There is no `.maestro/` or `e2e/` folder. TESTING.md admits "the rest of `src` is untested".
- Why it matters: None of the North Star journeys (plan, shop, cook) has an automated check, so every release relies on manual taps. Maestro can't target elements without testIDs or stable labels.
- Fix: v2 needs component tests per primitive and per screen state, a testID convention (`screen.element`), and a `.maestro/` flow per journey (listed below) run in CI on each PR.
- Effort: L

### QUAL-31 · Store: 50 of 79 public members untested, including account wipe and all planning
- Severity: High
- Where: src/store/__tests__/useStore.test.ts references 29 of 79 returned members. Untested members include:
  - planning: `assignToDay`, `unassignFromDay`, `clearWeekPlan`
  - shopping: `toggleCartItem`, `clearCart`, `clearShoppingList`, `restoreShoppingList`, `removeShoppingItem`
  - collections: `createCollection`, `deleteCollection`, `renameCollection`, `toggleRecipeInCollection`
  - user recipes: `saveRecipe`, `deleteRecipe`, `addCustomMeal`
  - `pickRandom` (Surprise me)
  - `wipeAllLocalData` (account deletion)
  - `signOutProfile`
  - `setPreferences`
  - the legacy storage migration (useStore.ts:256-297)
- Why it matters: The core loops and the destructive paths have no safety net.
- Fix: In v2, pure domain reducers in `src/domain` with node:test coverage of every transition, plus migration tests from fixture JSON.
- Effort: M

### QUAL-32 · Social, purchases, auth and push largely untested
- Severity: High
- Where:
  - supabaseFeedAPI.ts (1,490 lines): only mappers, guards and `getLikedPostIds` are tested; about 3 of 38 FeedAPI methods are exercised against the Supabase implementation (the local implementation covers 27 of 38)
  - pro/purchases.ts, pro/usePurchasesSync.ts, auth/socialLogin.ts, auth/signOutEverywhere.ts, push/pushClient.ts, pro/ai/client.ts, pro/ai/identifyIngredients.ts, social/notifications.ts: 0 tests
  - only pure purchaseMapping.ts is covered
- Why it matters: Money and auth paths that fail silently are the highest-risk bugs (review rejections, lost purchases).
- Fix: v1 is local-first, so the main thing is not to port these untested. When Pro returns, contract-test RevenueCat via a fake adapter.
- Effort: M

### QUAL-33 · Test quality: mostly behavioural, with some pinned to implementation or dead code
- Severity: Medium
- Where:
  - Good: useStore.test.ts asserts state after actions, and supabaseFeedApi.likes.test.ts asserts results plus query count.
  - Weak: src/__tests__/theme.test.ts:23-26 pins hex literals (`HIGH_CONTRAST_LIGHT.ink toBe '#000000'`) instead of testing contrast.
  - Test-only exports keep dead code alive: groceryConsolidate `consolidate`, feedCursor (5 exports), screenTracing, season `seasonForDate`/`inSeasonProduce`, and 7 supabaseFeedAPI mappers exported purely for tests (supabaseFeedAPI.ts:189-370).
  - Baseline eslint has 3 unused-var errors, including one in a test (supabaseFeedApi.likes.test.ts:31).
- Why it matters: Tests pass while shipped behaviour is unguarded.
- Fix: Test through public module APIs, delete tests with their dead code, and assert invariants (contrast, list totals) rather than literals.
- Effort: S

### QUAL-34 · Lint doesn't enforce structure
- Severity: Medium
- Where: eslint.config.js:32-61 turns off `react/no-unescaped-entities`, leaves `exhaustive-deps` as a warning (overridden 16 times), and has no rules for colour, size or emoji literals, file length, `no-explicit-any`, feature import boundaries or accessibility props.
- Why it matters: Every drift above got in because nothing stopped it.
- Fix: v2 already plans the map's structure rules. Also add: `max-lines: 300`, `@typescript-eslint/no-explicit-any: error`, `react-native/no-color-literals`, `react-native/no-inline-styles`, a custom no-emoji rule, `react-native-a11y/has-valid-accessibility-*`, and import boundaries for features.
- Effort: S

---

## Severity counts

| Severity | Count | Items |
|---|---|---|
| Critical | 2 | QUAL-1, QUAL-30 |
| High | 15 | QUAL-2, 3, 4, 12, 13, 15, 17, 18, 19, 20, 21, 25, 27, 31, 32 |
| Medium | 11 | QUAL-5, 6, 7, 14, 16, 22, 23, 24, 26, 33, 34 |
| Low | 6 | QUAL-8, 9, 10, 11, 28, 29 |
| **Total** | **34** | |

---

## Complete list of user journeys

This is derived from HomeScreen routes (HomeScreen.tsx:77-100), the SideDrawer items (SideDrawer.tsx:119-172), the Toolbar tabs, and each screen's actions. Each line is a Maestro flow to write. Items marked (v1-out) are social, cloud or AI features that v2's local-first v1 excludes. Keep them listed so scope stays explicit.

**First run and account**
- [ ] Accept terms (13+ checkbox) and get started (OnboardingModal)
- [ ] Onboarding taste quiz: eating style, avoid list, cuisines, weeknight time, skill level, then "See my dinners" (OnboardingModal)
- [ ] Onboarding menu reveal: spin again or accept "These look great" (OnboardingModal)
- [ ] Onboarding notification primer: allow or "Maybe later" (OnboardingModal)
- [ ] First-run checklist: open each step, complete it, dismiss the checklist (HomeScreen/FeedScreen, FirstRunChecklist)
- [ ] Sign in with Apple, Google or email; create an account; confirm by email (SignInScreen) (v1-out)
- [ ] Forgot password (SignInScreen), currently a dead end (v1-out)
- [ ] Set up profile: handle availability, name, bio, photo or avatar, then save (ProfileSetupModal) (v1-out)
- [ ] Edit local profile (ProfileModal)
- [ ] Sign out (SettingsModal)
- [ ] Delete account (SettingsModal, then HomeScreen confirm)
- [ ] Redo the welcome flow (SettingsModal)

**Discover and Save**
- [ ] Browse home: recipe of the day, mood rails, quick chips, "Browse by your pantry", trending (BrowseModal)
- [ ] Search recipes by text; clear the search (BrowseModal)
- [ ] Search people (BrowseModal) (v1-out; currently fake users)
- [ ] Filter by collection or quick chip and clear the filter (BrowseModal)
- [ ] Apply and clear filters: meal type, cuisine, diet, time, difficulty, one-pot (FiltersModal)
- [ ] Recommended "For you" and adjust preferences (RecommendedModal, PreferenceEditorSheet)
- [ ] Open a recipe: hero, ingredients, steps, notes, nutrition and disclaimer, photo credit (RecipeModal, RecipeBody, NutritionDisclaimerSheet)
- [ ] Adjust servings and see quantities scale (RecipeModal, ServingsAdjusterModal)
- [ ] Toggle metric or imperial units (RecipeBody)
- [ ] Save or unsave a recipe (RecipeModal, MealCard, MealRow, RecipeActionsSheet)
- [ ] Recipe actions sheet: add to plan, add or remove from the shopping list, save, save to a collection, share, email or export, search the web (RecipeActionsSheet)
- [ ] Hide or unhide a meal from rotation (MealRow, FilteredMealsModal)
- [ ] Recipe comments with a photo attached (RecipeModal) (v1-out)
- [ ] Saved library: view, remove, open (CookmarksModal)
- [ ] Collections: create, rename, delete, open, add or remove a recipe (CollectionsModal, CollectionPickerSheet)
- [ ] Recently viewed: view and clear (FilteredMealsModal kind=recents)
- [ ] My recipes: add a quick custom meal, import from a URL, remove (CustomMealsModal)
- [ ] Recipe editor: new or edit, with sections, ingredients, steps and notes; validation; delete (RecipeEditorModal)

**Plan and Shop**
- [ ] View this week's plan by day and slot (CartModal, "This week" tab)
- [ ] Assign a recipe to a day and slot from the plan (CartModal, then MealPickerSheet)
- [ ] Assign a recipe to a day and slot from a recipe (RecipeActionsSheet, then SlotPickerSheet)
- [ ] Remove a meal from the plan; clear the whole week (CartModal)
- [ ] Plan suggestions: accept a suggested meal (CartModal SuggestionCard)
- [ ] Shopping list: derived items, grouped by aisle (CartModal, "Shopping list" tab)
- [ ] Tick off items, remove an item, clear all, restore the list (CartModal)
- [ ] Share the shopping list or week plan (share sheet or clipboard) (CartModal)
- [ ] Empty plan and empty list states (CartModal)

**Cupboard**
- [ ] Add an ingredient by search, quick add or bulk add (PantryModal)
- [ ] Remove one ingredient; clear the cupboard with confirmation (PantryModal)
- [ ] Toggle "Assume I have pantry staples" (PantryModal)
- [ ] "You can make this tonight" matches and "Unlock more" suggestions (PantryModal)
- [ ] Scan the pantry shelf or a receipt, review, rename, untick, add (PantryScanFlow, ScanReviewSheet) (v1-out, Pro/AI)

**Cook and Remember**
- [ ] Surprise me: set meal, time and cupboard filters, spin, spin again, "Cook this" (SpinnerModal, then ResultDetailModal)
- [ ] Surprise me with no matches (loosen constraints) (SpinnerModal)
- [ ] Cook mode: step through, previous and next, ingredient sheet, step timers, finish (CookModeModal, StepText) (Pro-gated in the old app)
- [ ] Mark a recipe as cooked; log a cook (RecipeModal, store)
- [ ] Kitchen stats: streak, totals, top cuisines, most cooked; clear history (StatsModal)

**Social (all v1-out)**
- [ ] Feed: load, filter, like or unlike, open a post, trending (FeedScreen)
- [ ] Post detail: like, comment, save, send, add to shopping list or plan, view recipe (PostDetailModal)
- [ ] Post recipe view, then Cook Mode (PostRecipeModal)
- [ ] Share a bite: photos, title, cuisine, ingredients, steps, stats, post (Toolbar +, then CreatePostModal)
- [ ] Post menu: share, report, block, delete own (PostMenuSheet)
- [ ] User profile: follow or unfollow, followers and following lists, share, report or block (UserProfileModal, FollowListModal)
- [ ] Saved bites (SavedPostsModal)
- [ ] Inbox: messages and notifications tabs; new message; thread; send a post to someone (InboxModal, ThreadModal, ComposeMessageSheet, SendToSheet)

**Settings and Pro**
- [ ] Theme (light, dark, system) and high contrast (SettingsModal)
- [ ] Preferences: skill level, weeknight time (SettingsModal, PreferenceEditorSheet)
- [ ] Notification preferences and the OS-blocked path (SettingsModal)
- [ ] Private account toggle (SettingsModal) (v1-out)
- [ ] Crash reporting opt-out (SettingsModal)
- [ ] Export my data (SettingsModal)
- [ ] Privacy Policy and Terms links (SettingsModal)
- [ ] Paywall: view plans, purchase, restore, manage subscription (PaywallModal, SettingsModal) (v1-out)

**Navigation shell**
- [ ] Toolbar tabs: Feed, Browse, Cupboard, Plan (Toolbar)
- [ ] Side drawer: every destination, badges (SideDrawer)
- [ ] Back from any stacked screen returns to the previous one (HomeScreen nav stack)
- [ ] Error boundary recovery with "Try again" (ErrorBoundary)
