# The Pantry: v1 feature inventory against v2

**Written:** 30 September 2026, by Claude, from a read of the code (not only the docs).
**v1:** `/home/claude/v1/the-pantry-app` (paths below are relative to `src/` unless they start with `supabase/`, `app.json` or `legal/`).
**v2:** `/home/claude/the-pantry-v2` (paths relative to `src/`). Plan: `docs/V1-PARITY-PLAN.md` (P1–P3 done, P4–P11 to come).

## How to read the status column

| Status | Meaning |
|---|---|
| **DONE** | Built in v2 (file named). "DONE (diff)" means v2 does the job a different way, usually better. |
| **PARTIAL** | Some of it is built; the note says what's left. |
| **PLANNED Px** | A phase in `V1-PARITY-PLAN.md` names it. |
| **IMPLIED Px** | The phase covers the screen, but the plan doesn't name this piece. Easy to forget; worth adding to the phase's checklist. |
| **MISSING** | Not built, and no phase covers it. |
| **DROPPED** | Removed by a decision (named). Listed so the decision can be confirmed against D-025/D-026 ("every v1 feature"). |
| **DON'T COPY** | v1 had it, but it's dead, fake or a bad idea. Reason given. |

---

## MISSING: not in any phase

These need a phase (suggested) or a decision. The first block is the biggest gap: **Settings isn't named in any phase**, and most of what v1's Settings did has no home in the plan.

| # | Feature | Where in v1 | Suggested phase | Notes |
|---|---|---|---|---|
| M1 | Settings rebuilt to v1's grouped cards (profile card, Appearance, Measurements, Cooking, Notifications, Privacy, Pantry Pro, About, account buttons) | `screens/SettingsModal.tsx` | P6 | `features/settings/SettingsScreen.tsx` says "P6 restyles it", but P6's line in the plan doesn't list Settings. Add it. |
| M2 | Export my data (JSON file through the share sheet) | `screens/SettingsModal.tsx:handleExportData`, `data/dataExport.ts` | P6 (local data), extend in P8 (server data) | Was in REBUILD-MAP §Settings and PRODUCT §4.13, never built, and dropped out of the parity plan. The privacy policy must not promise it unless it exists (handover §8). |
| M3 | Terms of Service and Privacy Policy links in Settings › About | `screens/SettingsModal.tsx`, `config/legal.ts` | P6 (links), P11 (hosting) | v2 has no legal links anywhere yet. Also needed on the paywall (P10) and the onboarding consent (P7). |
| M4 | Per-question taste editors in Settings: cuisines, weeknight time, skill (each opens its own sheet) | `screens/PreferenceEditorSheet.tsx` | P6, after P7 adds skill | v2 edits diet and avoid list in place and sends everything else to "Retake the taste quiz" (`features/settings/FoodSettings.tsx`). |
| M5 | Crash and diagnostics opt-out switch | `screens/SettingsModal.tsx` (Privacy), `lib/sentry.ts:setSentryEnabled` | P11 (with Sentry) | P11 names Sentry but not the opt-out. The privacy policy promised it. |
| M6 | Notification settings: push master switch that asks iOS for permission, "Blocked, open Settings" alert, per-category switches (likes/comments/follows, messages) | `screens/SettingsModal.tsx`, `push/pushClient.ts` | P9 | P9 names "push" but not the settings rows. v2 has only the Sunday reminder switch. |
| M7 | Sign out, and sign out on every device (also logs out of RevenueCat) | `auth/signOutEverywhere.ts`, `screens/SettingsModal.tsx` | P8 | P8 names sign-in only. |
| M8 | Delete account (server: auth user, storage and RevenueCat via Edge Function; then wipes the phone; different wording for local-only users) | `screens/HomeScreen.tsx:onDeleteAccount`, `supabase/functions/delete-account` | P8 | App Store guideline 5.1.1(v) requires it once accounts exist. Not named in any phase. |
| M9 | Pantry Pro status row ("Yearly · renews 14 Mar") and Manage subscription | `screens/SettingsModal.tsx:proStatusLabel` | P10 | P10 names paywall and restore only. Manage should open Apple's subscription page, not the paywall (see DON'T COPY). |
| M10 | Forgot password | `screens/SignInScreen.tsx` ("Forgot?" was a stub alert) | P8 | Email sign-in without a reset path is a support trap. v1 never finished it. |
| M11 | Email-confirmation link opens the app and completes sign-in | `TODO.md` item 10 (never done in code) | P8 | Needed if email confirmation is on. |
| M12 | Nutrition panel per serving, scaled with servings, "Calculated/Estimated" label, and the "How we calculate this" sheet with coverage and skipped lines | `components/RecipeBody.tsx:NutritionPanel`, `screens/NutritionDisclaimerSheet.tsx`, `data/nutrition/`, `data/macros.ts` | Needs Lachlan's decision, then P3 follow-up | Parked in the plan's "held back" table as "Ask Lachlan" with no phase. K-5 also open. |
| M13 | "Pair with" suggestions on the recipe page | `components/RecipeBody.tsx`, `data/pairings.ts` | Decision | D-007 dropped it, but D-025/D-026 say every v1 feature comes across. Needs a call: confirm the drop, or add to P3. Only 26 recipes had pairings. |
| M14 | Oven temperatures and quantities inside method steps converted for imperial (180°C → 350°F, "200g" in a step) | `components/RecipeBody.tsx` (`convertIngredientLine` on steps), Cook Mode steps | P3 fix (small) | v2 converts ingredient lines only (`features/recipe/RecipeBody.tsx:Method` renders step text raw). An imperial cook sees Celsius in the method. |
| M15 | "Email or export recipe": the full recipe as text through the share sheet (Mail, Notes, AirPrint) for built-in recipes | `components/RecipeActionsSheet.tsx:handleExport`, `data/formatRecipe.ts` | P3 fix | v2 shares full text only for your own recipes; built-in recipes share the title plus a `thepantry://` link (`features/recipe/RecipeScreen.tsx:share`). |
| M16 | Share links that work for people without the app | `data/appMeta.ts` (v1 used `https://thepantry.app`) | P11 (universal links or a web page per recipe) | v2's `thepantry://recipe/<id>` is dead for a partner without the app and isn't tappable in many messengers. Same issue later for profile and post shares. |
| M17 | "Search the web" (recipe ⋯ menu, and on a dish with no recipe) | `components/RecipeActionsSheet.tsx:handleSearchWeb`, `screens/RecipeModal.tsx:openSearch` | P3, or drop | Cheap, but sends users to Google. Recommend dropping; needs a line in DECISIONS. |
| M18 | Put a recipe on the shopping list without giving it a day ("Add to grocery list", and the cart button on a post) | `components/RecipeActionsSheet.tsx`, `store/useStore.ts:addToCart`, `screens/PostDetailModal.tsx` | P4 decision | v2 derives the list from dated plan entries only (right, per the map). Options: an "unscheduled this week" plan entry, or drop. Needs a decision. |
| M19 | Share the week plan as text ("My week: Monday · Dinner · …") from the This week tab | `screens/CartModal.tsx:shareWeekPlan` | P4 | P4 says "sharing" but v2 only shares the shopping list. Make it explicit. |
| M20 | A list of hidden ("Not for us") dishes, with un-hide | `screens/FilteredMealsModal.tsx` (kind `hidden`, "Out of rotation") | P6 | In v2 a hidden recipe vanishes from Browse and search, so the only way back is finding it through Cookmarks or Recently viewed (`features/recipe/RecipeScreen.tsx` "Show this again"). |
| M21 | Tablet support (v1 `supportsTablet: true`) | `app.json` | P11 decision | v2 sets `supportsTablet: false`. Fine for launch if intended; worth one line in DECISIONS since existing TestFlight iPad users would lose the app. |

### Gaps neither app covers (not v1 features, but the plan's own rules need them)

| Feature | Why it's needed | Suggested phase |
|---|---|---|
| A "Blocked accounts" list in Settings with unblock | v1 could only unblock from the blocked person's profile, which blocking hides. Rule 6 ("blocking everywhere") needs a way back. | P9 |
| Report a message and block from inside a conversation | Rule 6 says "reporting everywhere, messages included". v1 threads had neither. | P9 (already implied by rule 6) |
| Delete your own comment | v1 had `deleteComment` in `social/useFeed.ts` but no button. | P9 |
| Server that actually sends push notifications | v1 stored tokens (`push_tokens`) but nothing ever sent a push. | P9 |
| Remove a recipe from a collection while viewing the collection | Neither app has it; only the add-to-collection sheet can untick. | P6 |
| Move or swap a planned meal | PRODUCT §4.6 asks for it; `store/plan.ts:moveEntry` exists with no button. v1 could only re-pick a slot. | P4 |

---

## PARTIAL: started but not finished

| Feature | Where in v1 | v2 status | What's left |
|---|---|---|---|
| Recommended: the full ranked "For you" list with "Update preferences" and a "Nothing matched → Adjust preferences" state | `screens/RecommendedModal.tsx` | PARTIAL `features/feed/FeedScreen.tsx` ("For you", 4 picks), `domain/suggestions/forYou.ts` | P3 lists "recommended" as done, but there's no full list. v1 reached it from the checklist's "Find tonight's dinner". Decide whether Feed picks replace it (then log it) or build the list in P7 with the checklist. |
| Photo credits as links (photographer and Unsplash/Pexels, with UTM tags); "AI-generated photo" label | `screens/RecipeModal.tsx` credit row, `data/recipeImageCredits.json` | PARTIAL `features/recipe/RecipeScreen.tsx` (plain text `image.credit`) | Credits show but aren't tappable. Unsplash's guidelines ask for linked attribution. Check the "AI-generated" label survived conversion. |
| Kitchen stats | `screens/StatsModal.tsx`, `data/cookStats.ts` | PARTIAL `features/saved/SavedLists.tsx:CookedList` | Built: cooked list, times cooked, weekly streak. Left (P6): streak hero, this week, total cooks, best streak, top cuisines, most cooked, "Clear cooking history" with confirm. v1's streak was *daily*; v2 uses weekly (better, keep). |
| Spinner | `screens/SpinnerModal.tsx` | PARTIAL `features/surprise/SurpriseScreen.tsx` | P6. See the Spinner section for the pieces. |
| Cook Mode | `pro/cookMode/CookModeModal.tsx` | PARTIAL `features/cook/CookScreen.tsx` | P6. See the Cook Mode section. |

---

## 1. App shell and navigation

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Header: menu button, "The Pantry" wordmark centred | `components/Masthead.tsx` | DONE `features/shell/AppHeader.tsx` | |
| Header inbox button with combined unread badge (messages + notifications) | `components/Masthead.tsx`, `screens/HomeScreen.tsx:mastheadBadge` | PLANNED P9 | Held back on purpose (D-027). |
| Header avatar (photo or initial) opens your profile, or sign-in when signed out | `components/Masthead.tsx`, `HomeScreen.tsx:openSelfProfile` | PLANNED P8 | v2 avatar opens Settings until accounts exist (D-027). |
| Bottom tabs Feed · Browse · + · Cupboard · Plan | `components/Toolbar.tsx` | DONE `features/shell/TabBar.tsx` | |
| Plan tab count badge | `Toolbar.tsx` (`cartCount`) | DONE `features/shell/TabBar.tsx` | v2 counts planned meals, not "cart" recipes. |
| Centre "+" (Share a bite) | `Toolbar.tsx`, `CreatePostModal.tsx` | DONE (diff) `TabBar.tsx` → recipe editor; PLANNED P9 for posts | D-027. |
| Tab bar slides away when the keyboard opens | `Toolbar.tsx` | DONE `features/shell/useKeyboardShown.ts` | |
| Switching tab resets that tab to its root | `HomeScreen.tsx:selectTab` | DONE (Expo Router tabs) | |
| Side drawer: brand row, Discover / My kitchen / Tools sections, Settings row, profile row | `screens/SideDrawer.tsx` | DONE `features/shell/DrawerScreen.tsx` | Drawer is a route (better, ARCH-1). |
| Drawer counts on Cookmarks, Collections, My recipes, Recently viewed, Plan | `SideDrawer.tsx` | DONE `features/shell/useCounts.ts` | v1's badge text was invisible in dark mode (spec §8.2); don't copy that. |
| Drawer rows Notifications and Messages | `SideDrawer.tsx` | PLANNED P9 | |
| Drawer profile row: "Sign in / Set up your profile" or name + email | `SideDrawer.tsx` | PLANNED P8 | v2 shows "Your kitchen · Local profile". |
| Back always returns to where you came from | `HomeScreen.tsx` nav stack | DONE (Expo Router stack) | |
| Toasts with icon, auto-hide | `components/Toast.tsx` | DONE (diff) `ui/patterns/Toast.tsx` | v2 adds Undo on toasts (better). |
| Loading: blank screen until the store hydrates | `HomeScreen.tsx` (`!store.loaded`) | DONE (diff) `app/_layout.tsx` keeps the splash up | |
| Error screen with "Try again" | `components/ErrorBoundary.tsx` | DONE `features/app/RootErrorScreen.tsx`; per-route boundaries PLANNED P11 | v1 printed the raw error message (DON'T COPY). |
| Not-found route | none | DONE `features/app/NotFoundScreen.tsx` | v2 only. |
| Deep link to a recipe (`thepantry://recipe/<id>`) | none in v1 (scheme only) | DONE (Expo Router) | See M16: links for non-users. |

## 2. Feed (home)

v2's Feed carries "Tonight", "Coming up" and "For you" until posts arrive (D-027). Everything post-related is P9.

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Tonight: planned dinner, Start cooking, "Surprise me" | none (v2 only) | DONE `features/feed/FeedScreen.tsx` | |
| First-run "Get your first win" checklist: progress ring, 4 steps (taste · find tonight's dinner · save a recipe · set up profile), ticks from real activity, dismiss | `components/FirstRunChecklist.tsx` | PLANNED P7 | "Set up your profile" step needs P8. |
| Hero carousel of the top 5 posts with page dots | `screens/FeedScreen.tsx:HeroCarousel` | IMPLIED P9 | The "EDITOR'S PICK" label on every hero is fake (DON'T COPY the label). |
| Two-column grid of posts: photo, title, @author, likes, comments, minutes | `FeedScreen.tsx:FeedTile` | PLANNED P9 | |
| One-tap like heart on each tile | `FeedTile` | PLANNED P9 | |
| "Several photos" badge on a tile | `FeedTile` | IMPLIED P9 | |
| Video tiles autoplay muted, only while on screen | `FeedScreen.tsx:TileVideo` | PLANNED P9 (rule 12) | |
| Filter dropdowns: cuisine, time, difficulty, meal, diet | `FeedScreen.tsx`, `components/FilterDropdown.tsx` | IMPLIED P9 | |
| Pull to refresh | `FeedScreen.tsx` | PLANNED P9 (rule 3) | |
| Ranking by onboarding cuisines and diet | `social/useFeed.ts:scorePost` | IMPLIED P9 | Plan says no algorithmic "For You" feed (handover §1). Decide. |
| States: loading, "Couldn't load the feed", "Quiet round here", "Try a different filter" | `FeedScreen.tsx` | IMPLIED P9 | |
| Tap author handle opens their profile | `FeedTile`, `HeroCard` | PLANNED P9 | |
| Accessibility label per tile ("Pad thai by @sam, 25 minute cook time") | `FeedScreen.tsx:tileAccessibilityLabel` | IMPLIED P9 / P11 | |

## 3. Browse

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| "BROWSE / Discover" title | `screens/BrowseModal.tsx` | DONE `features/recipes/RecipesScreen.tsx` | |
| Search box, clear button | `BrowseModal.tsx` | DONE `RecipesScreen.tsx` | v2 adds typo tolerance (`domain/recipes/search.ts:editDistance`). |
| Ranked search: name → cuisine → ingredients → technique | `data/searchRecipes.ts` | DONE `domain/recipes/search.ts` | |
| Search people from the same box | `BrowseModal.tsx` (placeholder "people…") | PLANNED P9 | |
| Filters button with active-count badge | `BrowseModal.tsx` | DONE `RecipesScreen.tsx` | |
| Recipes / People tabs | `BrowseModal.tsx` | PLANNED P9 (People tab) | v1's People tab listed simulated users even in cloud mode (DON'T COPY). |
| Recipe of the day (daily, deterministic) | `BrowseModal.tsx`, `data/recipeOfTheDay.ts` | DONE `features/recipes/BrowseSections.tsx`, `domain/recipes/browse.ts` | Free in v2 (v1's paywall sold it as Pro but never gated it). |
| Quick chips (Pasta, Bowls, 30 min, Vegan, Comfort, Bake, Spicy, One-pot, In season, Family, Breakfast) | `BrowseModal.tsx:QUICK_CHIPS` | DONE `BrowseSections.tsx`, `domain/recipes/browse.ts:quickChips` | v2 uses tags, not name regexes. |
| "Cook by mood" photo shelf with counts; tapping filters the grid | `BrowseModal.tsx:COLLECTIONS`, `data/mood.ts` | DONE `BrowseSections.tsx` (`ShelfCard`) | |
| Active shelf pill with count and clear | `BrowseModal.tsx` | DONE `RecipesScreen.tsx` (pill + "N recipes") | |
| "Trending this week / What's hot" numbered list of most-liked posts, skeleton while loading | `BrowseModal.tsx:TrendingRow` | PLANNED P9 | |
| "Browse by your pantry" 2×2 grid | `BrowseModal.tsx` | DONE (diff) `BrowseSections.tsx` "Cook with what you have" + "Something new" | v1's section was 4 random recipes despite its title. |
| See the whole catalogue | v1: search with no query showed a shuffled catalogue | DONE `BrowseSections.tsx` "See all N recipes" | |
| Save (bookmark) on each card | `BrowseModal.tsx:PreviewCard` | DONE `ui/patterns/RecipeGrid.tsx` | |
| Diet and avoid list hide recipes from Browse | `BrowseModal.tsx:eligibleMeals` (via `scoreMeal`) | DONE (diff) | v2 hides "Not for us" dishes; check Browse also honours diet/avoid when onboarded (v1 did). |
| Browse resets to the discover view when reopened | `BrowseModal.tsx` | DONE (diff) | v2 keeps the search until cleared, with a "Clear" button. |
| Empty results state | `BrowseModal.tsx` ("No meals match.") | DONE `RecipesScreen.tsx` (designed, with "Clear search and filters") | |

## 4. Filters

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Filter sheet "Refine your rotation": cuisine, diet, meal type, time, difficulty, cookware (one-pot) | `screens/FiltersModal.tsx` | DONE `features/recipes/FiltersScreen.tsx` | v2 adds a second switch (in season). |
| Clear all filters | `FiltersModal.tsx` | DONE `RecipesScreen.tsx` "Clear" | |
| Filters persist between sessions | `store/useStore.ts` (`filters`) | DONE `store/recipeFilters.ts` (check it persists) | |
| Filters narrow the spinner's pool | `SpinnerModal.tsx` (`store.visibleMeals`) | DONE (diff) | In v1 the Filters sheet *only* affected the spinner, not Browse. v2 applies them to Browse, and the spinner has its own time chips plus diet/avoid rules. Say so in P6 so nobody "restores" the v1 behaviour. |

## 5. Recipe page

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Full-bleed hero photo, cuisine-tinted fallback, sheet overlapping it | `screens/RecipeModal.tsx` | DONE `features/recipe/RecipeScreen.tsx` | |
| Back and ⋯ buttons over the photo | `RecipeModal.tsx` | DONE `RecipeScreen.tsx` | |
| Title; "Edit" pill on your own recipes | `RecipeModal.tsx` | DONE `features/recipe/RecipeHeader.tsx` | |
| "By The Pantry" / "By you" byline | `RecipeModal.tsx:RecipeAuthorChip` | DONE `RecipeHeader.tsx` | |
| Action row: Save (toast), Comment (jumps to comments), Share, Cook/Cooked toggle | `RecipeModal.tsx:RecipeActionRow` | DONE `RecipeHeader.tsx` (Save, Plan, Share, Cook); Comment PLANNED P9 | v2 swaps Comment for Plan until P9. "Cook" logs a cook with undo instead of a toggle (better). |
| Info tiles: total minutes, difficulty, servings (tap to adjust; "tap to reset" when changed) | `components/RecipeBody.tsx:MetaRow` | DONE `RecipeHeader.tsx` | |
| Servings sheet: 1–16 slider, "written for N", Reset, Done | `screens/ServingsAdjusterModal.tsx`, `components/Slider.tsx` | DONE (diff) `features/recipe/ServingsSheet.tsx` (stepper 1–24, plus metric/imperial) | |
| Quantities scale with servings | `data/scaleIngredient.ts` | DONE `domain/ingredients/format.ts` | |
| Metric/imperial conversion of ingredient lines | `data/units/`, `RecipeBody.tsx` | DONE | |
| Oven temps and amounts inside steps converted | `RecipeBody.tsx` | MISSING (M14) | |
| "Start Cook Mode · Guided, one step at a time" button | `RecipeModal.tsx` | DONE `RecipeHeader.tsx` | Free in v2 (D-003); Pro in v1. |
| Ingredients in groups, tap to tick while gathering | `RecipeBody.tsx` | DONE `features/recipe/RecipeBody.tsx` | |
| "HAVE" badge when the cupboard covers a line | `RecipeBody.tsx`, `data/pantryMatch.ts` | DONE `RecipeBody.tsx` (ingredient-id match, better) | |
| Substitution tip under an ingredient | `RecipeBody.tsx`, `data/substitutions.ts` | DONE `domain/recipes/substitutions.ts` | |
| Numbered directions with the accent rule | `RecipeBody.tsx` | DONE `RecipeBody.tsx:Method` | |
| Tap a time in a step to start a timer (pause/resume, haptic when done) | `components/StepText.tsx`, `components/stepDuration.ts` | DONE (diff) | v2 shows times as chips on the page; timers start in Cook Mode only. Deliberate, but it's a behaviour change: confirm with Lachlan. |
| Notes card | `RecipeBody.tsx` | DONE `RecipeBody.tsx:Notes` | |
| Summary line | none | DONE | v2 only. |
| Pair with | `RecipeBody.tsx`, `data/pairings.ts` | DROPPED D-007 (see M13) | |
| Nutrition panel and methodology sheet | `RecipeBody.tsx`, `NutritionDisclaimerSheet.tsx` | MISSING (M12) | |
| Comments with optional photo, "Be the first", sign-in prompt | `RecipeModal.tsx:RecipeComments` | PLANNED P9 | v1 comments on built-in recipes failed in cloud mode (DON'T COPY the synthetic id). |
| Photo credit | `RecipeModal.tsx` | PARTIAL (see above) | |
| Recently viewed recorded on open | `HomeScreen.tsx:recordView` | DONE `RecipeScreen.tsx` | |
| "No recipe yet" page for a name-only dish (Add a recipe, Search the web) | `RecipeModal.tsx` fallback | DONE (diff) | v2 turns name-only dishes into drafts under My recipes › To finish (D-005, D-021). |
| Recipe not found | none | DONE `RecipeScreen.tsx` empty state | |
| ⋯ menu: Add to plan | `components/RecipeActionsSheet.tsx` | DONE `RecipeScreen.tsx` ActionSheet | |
| ⋯ menu: Add to / remove from grocery list | `RecipeActionsSheet.tsx` | MISSING (M18) | |
| ⋯ menu: Save / remove from saved | `RecipeActionsSheet.tsx` | DONE (on the action row) | |
| ⋯ menu: Save to a collection | `RecipeActionsSheet.tsx` | DONE `features/recipe/CollectSheet.tsx` | |
| ⋯ menu: Share (app invite with link) | `RecipeActionsSheet.tsx:handleShare`, `data/appMeta.ts` | DONE (diff) | See M16. |
| ⋯ menu: Email or export recipe | `RecipeActionsSheet.tsx:handleExport` | MISSING (M15) | |
| ⋯ menu: Search the web | `RecipeActionsSheet.tsx` | MISSING (M17) | |
| ⋯ menu: Not for us / Show this again; Edit recipe | none (v1 had no hide button) | DONE `RecipeScreen.tsx` | v2 only. |
| Planning from the page asks for day and slot | `screens/SlotPickerSheet.tsx` (7×3 grid, shows what's already in each slot, tap a filled slot to replace) | DONE (diff) `features/recipe/PlanRecipeSheet.tsx` (day chips, meal, servings) | v2 doesn't show what's already planned in a slot. Consider showing it in P4. Also: v2 starts servings at the recipe's default, not the servings chosen on the page (PRODUCT §4.3 wanted them to flow through). |

## 6. Plan

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| "PLAN / Your week" title | `screens/CartModal.tsx` | DONE `features/plan/PlanScreen.tsx` | |
| Progress bar "N of 21 meals" | `CartModal.tsx` | IMPLIED P4 | v2 shows "N dinners planned". |
| This week / Shopping list underline tabs | `CartModal.tsx` | DONE `PlanScreen.tsx` | |
| This week vs next week | none (weekday-based, D-009) | DONE `PlanScreen.tsx` | v2 only; real dates. |
| Week strip: MON 29 with three fill dots per day, today selected | `CartModal.tsx` | PLANNED P4 | |
| Day view: Breakfast, Lunch, Dinner slots; "Add breakfast" etc. on empty slots | `CartModal.tsx` | PLANNED P4 | v2 lists days with "Add" and entries tagged by slot. |
| Planned meal card: photo, cuisine eyebrow, title, minutes · difficulty, × to clear | `CartModal.tsx:MealCard` | DONE (diff) `features/plan/PlanEntryRow.tsx` | v2 adds per-meal servings and undo. v1's × also wiped the recipe from the shopping list. |
| Add meal sheet: search, favourites first | `screens/MealPickerSheet.tsx` | DONE `features/plan/AddToPlanSheet.tsx` (saved first, then ideas for the slot) | |
| Suggestions shelf for the day ("From your cupboard" or "Popular this week"); tap drops into the first empty slot | `CartModal.tsx`, `data/planSuggestions.ts` | PLANNED P4 | |
| Shopping list peek card on This week ("N items for M meals", first 5 items, "+N more") | `CartModal.tsx` | IMPLIED P4 | |
| Share button in the title (week plan on This week, list on Shopping list) | `CartModal.tsx` | PARTIAL: list DONE `features/plan/ShoppingListView.tsx`; week plan MISSING (M19) | |
| Same recipe several times a week | not possible in v1 | DONE | v2 only. |
| Move a planned meal to another day/slot | not in v1 | MISSING (neither) | `store/plan.ts:moveEntry` exists with no UI. PRODUCT §4.6 wants move/swap; add to P4. |
| Past days muted, old weeks pruned | none | DONE `domain/plan/week.ts` | v2 only. |
| Toast on add ("… added to Monday dinner") | `HomeScreen.tsx`, `CartModal.tsx` | DONE (with undo) | |
| Planner gated behind Pro | `CartModal.tsx`, `HomeScreen.tsx` (`requirePro('planner')`) | DROPPED D-003 | Free for this week; next week Pro (P10). |

## 7. Shopping list

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Built from the planned recipes, never stored | `CartModal.tsx`, `data/groceryConsolidate.ts`, `data/groceryNormalise.ts` | DONE `domain/shopping/derive.ts`, `features/plan/useWeekList.ts` | v2 scales by servings and respects the cupboard; v1 did neither. |
| Group by aisle | `data/groceryAisles.ts`, "By aisle" toggle | DONE (diff) | Always grouped in v2; v1 defaulted to a flat list with a toggle. |
| Item count | `CartModal.tsx` | DONE ("N to buy for M meals") | |
| Remove one item (×) | `CartModal.tsx`, `store.removeShoppingItem` | DONE (per week, with undo) | v1 hid that ingredient by name forever. |
| Clear all | `CartModal.tsx`, `store.clearShoppingList` | PLANNED P4 ("clearing") | |
| Restore N dismissed items | `CartModal.tsx` | DONE `ShoppingListView.tsx` | |
| Tick items off | store only (`cartChecked`); no UI in v1 | DONE `ShoppingListView.tsx` | v1 never let you tick. |
| Ticked items move to the cupboard | none | DONE | v2 only. |
| Manual extras ("Dishwashing liquid") | none | DONE | v2 only. |
| "In your cupboard" section with add-back | none | DONE | v2 only. |
| Share list as text | `data/shareCart.ts`, `CartModal.tsx` | DONE `domain/shopping/derive.ts:formatListForSharing` | v1 also had an unused "by recipe" share format. |
| Empty states ("Add meals to the plan…", "Everything's ticked off…") | `CartModal.tsx` | DONE | |
| Sharing the list gated as Pro | `data/pro.ts` (`grocery_export`) | DROPPED D-003 | Was never actually gated in v1. |

## 8. Cupboard

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| "CUPBOARD / What do you have?" title and subtitle | `screens/PantryModal.tsx` | DONE `features/cupboard/CupboardScreen.tsx` | |
| Snap pantry (AI reads the shelf), Scan receipt (bulk add) tiles | `PantryModal.tsx:ScanShortcut`, `pro/pantryScan/` | PLANNED P10 | |
| Your cupboard grouped into 7 categories with tinted "jar" chips; tap to remove | `PantryModal.tsx:CupboardGroup`, `data/ingredients.ts` | PLANNED P5 (categories) | v2 is a flat alphabetical list. v1 tints were light-only (spec §8.2). |
| Count line ("12 ingredients · 4 categories") | `PantryModal.tsx` | IMPLIED P5 | v2 shows "In the cupboard · N". |
| Clear cupboard, with confirm | `PantryModal.tsx:confirmClear` | IMPLIED P5 | Not named in P5. |
| Quick adds (popular ingredients not yet added) | `PantryModal.tsx`, `data/ingredients.ts:QUICK_ADD_NAMES` | PLANNED P5 | |
| Search ingredients to add, "In cupboard" state on results | `PantryModal.tsx` | DONE `CupboardScreen.tsx` | |
| "Assume I have pantry staples" switch | `PantryModal.tsx` | PLANNED P5 | v2 always assumes salt, pepper, oil, water. v1's switch wasn't saved between visits. |
| Recipes you can make: "From your saved" shelf | `PantryModal.tsx:savedMatches` | PLANNED P5 | |
| "Suggested for you" shelf, ranked by match and taste | `PantryModal.tsx:suggestedMatches` | PARTIAL `CupboardScreen.tsx` "What can I make?" (6 rows); PLANNED P5 | |
| Match card: photo, % badge, minutes, "N to buy" | `PantryModal.tsx:MatchCard` | IMPLIED P5 | v2 notes "You have 3 of 5". |
| "0 recipes match, add a couple more" state | `PantryModal.tsx` | IMPLIED P5 | |
| "Add one thing": the ingredient that unlocks the most near-miss recipes (top 3) | `PantryModal.tsx:topUnlocks`, `UnlockRow` | IMPLIED P5 | Not named in P5. Good feature; keep. |
| "Stock the cupboard": category tabs and a tile grid to tap items in/out | `PantryModal.tsx:BrowseTile` | IMPLIED P5 (categories) | |
| Undo when removing an item | none | DONE | v2 only ("… used up", Undo). |
| "Move ticked shopping here" switch | none | DONE | v2 only. |

## 9. Library: Cookmarks, Collections, My recipes, Recently viewed, Stats

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Cookmarks page: cream-card grid, count, newest first, unsave from the card | `screens/CookmarksModal.tsx` | PARTIAL `features/saved/LibraryScreens.tsx`, `SavedLists.tsx:BookmarksList`; PLANNED P6 | v2 is a list with no unsave on the card. |
| Saved bites mixed into Cookmarks | `CookmarksModal.tsx:SavedBiteCard` | PLANNED P9 (saves) | |
| "Saved bites" page | `screens/SavedPostsModal.tsx` | DON'T COPY | Unreachable in v1 (no drawer row). Cookmarks covers it. |
| Collections page "Your shelves": 2-column grid with 4-photo mosaic covers | `screens/CollectionsModal.tsx` | PARTIAL `SavedLists.tsx:CollectionsList` (list); PLANNED P6 | |
| New collection (dialog), max 40 characters | `CollectionsModal.tsx` | DONE (with duplicate-name check) | |
| Open a collection: its recipes, empty state | `CollectionsModal.tsx` | DONE `features/saved/CollectionScreen.tsx` | |
| Rename collection | store only in v1 (no UI) | DONE `CollectionScreen.tsx` | v2 only in practice. |
| Delete collection | `CollectionsModal.tsx` (long-press, confirm) | DONE (button, undo) | |
| Add to collection sheet: tick several, create inline | `screens/CollectionPickerSheet.tsx` | DONE `features/recipe/CollectSheet.tsx` | |
| Free users limited to 3 collections | none | PLANNED P10 (D-003) | v2 only. |
| My recipes: add a name-only meal ("included in spins") | `screens/CustomMealsModal.tsx` | DONE (diff) drafts in `features/saved/MineList.tsx` | |
| Import a recipe from a link (schema.org JSON-LD) | `CustomMealsModal.tsx`, `data/importRecipe.ts` | DONE `features/editor/ImportLinkScreen.tsx`, `domain/recipes/importLink.ts` | v2 opens the editor to check before saving (better). |
| Remove a custom meal (also clears it from plan, saves, hidden) | `CustomMealsModal.tsx`, `store.removeCustomMeal` | DONE (delete with undo in the editor) | Check a deleted recipe's plan entries show "no longer available" (they do, `PlanEntryRow.tsx`). |
| Recipe editor: title, serves, prep, cook, difficulty, ingredient sections, method, notes, delete | `screens/RecipeEditorModal.tsx` | DONE `features/editor/RecipeEditorScreen.tsx`, `EditorDetails.tsx` | v2 adds cuisine and meal type, text-first (D-021). Check ingredient *section headings* are supported. |
| Edit a built-in recipe (saved as your own version) | `HomeScreen.tsx` editor with `store.getRecipe` override | DONE (diff) | Old edits import as "(my version)" (D-024). |
| Recently viewed: grid, count, Clear | `screens/FilteredMealsModal.tsx` (kind `recents`) | PARTIAL `SavedLists.tsx:RecentList`; Clear IMPLIED P6 | No "Clear" in v2. |
| Hidden dishes page | `FilteredMealsModal.tsx` (kind `hidden`) | MISSING (M20) | |
| Kitchen stats | `screens/StatsModal.tsx` | PARTIAL (see PARTIAL table), PLANNED P6 | |
| "Favourites / Loved meals" page | `FilteredMealsModal.tsx` (kind `favorites`) | DON'T COPY | Unreachable duplicate of Cookmarks. |

## 10. Surprise me (the spinner)

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| "TONIGHT'S DINNER / Surprise me" page with the tab bar | `screens/SpinnerModal.tsx` | DONE `features/surprise/SpinnerScreen.tsx` (pushed page, D-031) | v1 wrongly showed the Plan tab as active (spec §8.2). |
| Card deck: hero card with two tilted peek cards; tap the card to spin | `SpinnerModal.tsx` | PLANNED P6 | v2 shows a text reel then a result card. |
| Decelerating spin with wobble and settle, success haptic, respects Reduce Motion | `SpinnerModal.tsx` | DONE (diff) `SurpriseScreen.tsx` (reel with selection haptics each tick; fade under Reduce Motion) | Motion values in spec §6 for P6. |
| Counter "03 / 42" | `SpinnerModal.tsx:Header` | IMPLIED P6 | |
| Meal filter (Dinner, Lunch, Breakfast, Snack) | `SpinnerModal.tsx` | IMPLIED P6 | v2 spins dinners only (`features/surprise/useSurprise.ts`). |
| Time filter (15/30/45/60/over 60) | `SpinnerModal.tsx` | DONE (diff) (Any, 30, 45) | |
| "From cupboard" filter | `SpinnerModal.tsx` | IMPLIED P6 | v1's was fake (≤6 ingredients). Build it on real cupboard matching or drop it. |
| "Why this" panel (pantry coverage, time, "for you") | `SpinnerModal.tsx` | IMPLIED P6 | Keep only true reasons (see DON'T COPY). |
| "How Surprise me works" info sheet | `SpinnerModal.tsx:InfoSheet` | IMPLIED P6 | |
| Spin again / Cook this | `SpinnerModal.tsx` | DONE (Spin again, Plan it, Cook it) | |
| Never the same dish twice in a row; avoids recent picks | `SpinnerModal.tsx`, `store.recordPick` | DONE (diff) `domain/suggestions/surprise.ts` (skips planned, recently cooked, already shown) | |
| Honours diet, avoid list, hidden | not in v1 | DONE | v2 only; v1 could serve beef to a vegetarian. |
| Empty pool state ("No dishes match. Loosen a constraint") | `SpinnerModal.tsx` | DONE `SurpriseScreen.tsx` | |
| Drawer › Spinner | `SideDrawer.tsx` | DONE `DrawerScreen.tsx` | |
| Result sheet "TONIGHT, YOU'RE HAVING" | `screens/ResultDetailModal.tsx` | DON'T COPY | Never opened in v1 (dead). |

## 11. Cook Mode

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Full screen, one step at a time, big numeral, "STEP" | `pro/cookMode/CookModeModal.tsx` | DONE `features/cook/CookScreen.tsx` | |
| Header: close, "COOK MODE" + dish name, step counter "3 / 9" | `CookModeModal.tsx` | PARTIAL ("Step 3 of 9"); restyle PLANNED P6 | Dish name not shown in v2. |
| Segmented progress strip | `CookModeModal.tsx` | IMPLIED P6 | |
| Swipe left/right between steps; Previous / Next / Done | `CookModeModal.tsx` | DONE (plus tap anywhere, D-004) | |
| Haptic tick on each step change | `CookModeModal.tsx:buzz` | IMPLIED P6 | |
| Keep the screen awake | `CookModeModal.tsx` | DONE (`useKeepAwake`) | |
| Ingredients sheet with quantities, section headings, HAVE badges, substitution tips, "Back to cooking" | `CookModeModal.tsx` | PARTIAL (toggle to a plain scaled list); P6 | v2 lacks sections, HAVE badges and tips. |
| Tap-to-start timers from step text | `components/StepText.tsx` | DONE (diff) `features/cook/useCookTimers.ts`, `TimerBar.tsx` | v2 timers survive the lock screen with a notification (better). No pause/resume (v1 had it): IMPLIED P6. |
| Done logs the cook | not in v1 | DONE | v2 only. |
| Uses the servings chosen on the recipe page | `RecipeModal.tsx` passes scaled lines | DONE (servings param) | |
| Cook Mode from a post's recipe card | `screens/PostRecipeModal.tsx` | IMPLIED P9 | |
| "No written steps yet" state | `CookModeModal.tsx` | DONE (Cook button hidden when no steps) | |
| Cook Mode gated behind Pro | `HomeScreen.tsx` (`requirePro('cook_mode')`) | DROPPED D-003 | |

## 12. Onboarding

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Welcome hero with looping cooking video behind every step | `screens/OnboardingModal.tsx`, `assets/welcome-bg.mp4` | IMPLIED P7 | Not named. Weigh the asset size and autoplay fuss before copying. |
| Terms + Privacy consent checkbox gating "Get started" | `OnboardingModal.tsx` | PLANNED P7 ("terms") | Needs hosted legal pages (M3). |
| Skip at every step; back button; progress bar | `OnboardingModal.tsx` | DONE (Skip, Back) `features/welcome/WelcomeScreen.tsx`; progress bar IMPLIED P7 | |
| "What brings you here?" multi-select intents | `OnboardingModal.tsx:StepIntent`, `data/preferences.ts:INTENT_OPTIONS` | PLANNED P7 | v1 collected intents but used them nowhere (see DON'T COPY). Give them a job or leave them out. |
| Diet (omnivore/pescatarian/vegetarian/vegan) + things to avoid (9 options + free text) | `StepDietAndAvoid` | DONE `features/welcome/TasteSteps.tsx:EatStep` | v2 maps avoid options to ingredient groups (D-006). v2's free-text avoid is in Settings only; check P7 adds it to the quiz. |
| Cuisines you love | `StepCuisines` | DONE `TasteSteps.tsx:LikeStep` | |
| Weeknight time (quick / up to an hour / I have time) | `StepTimeAndSkill` | DONE (30 min / 45 min / no rush) | |
| Skill level (easy / medium / adventurous) | `StepTimeAndSkill` | PLANNED P7 | Not in v2 preferences yet. |
| Measurement system | not in v1 onboarding | n/a | |
| "Tonight, for you" reveal: real picks, peek a recipe, spin again for 3 more | `OnboardingModal.tsx:RevealStep` | DONE `WelcomeScreen.tsx` (hero, "Or this", "Show me others", "Cook this tonight" plans it) | |
| Notification primer before the iOS prompt | `OnboardingModal.tsx:NotifStep` | DONE (diff) (Sunday reminder); PLANNED P7 | v1's primer promised dinner reminders that were never scheduled (DON'T COPY the promise). |
| Opens automatically on first launch; redo from Settings | `HomeScreen.tsx`, `SettingsModal.tsx` | DONE `features/app/useNeedsWelcome.ts`, Settings "Retake the taste quiz" | |
| First-run checklist | `components/FirstRunChecklist.tsx` | PLANNED P7 | |
| Import the old app's saved data and "Welcome back" line | `store/useStore.ts` (legacy keys) | DONE `store/oldAppImport.ts`, `domain/legacy/oldApp.ts` | v2 only in this form (D-005, D-024). |

## 13. Settings

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Grouped white cards layout | `screens/SettingsModal.tsx` | MISSING (M1) | |
| Profile card (photo, name, email; "Sign in" when signed out) | `SettingsModal.tsx` | PLANNED P8 (profiles) | Not named for Settings. |
| Theme: System / Light / Dark | `SettingsModal.tsx`, `themeMode.ts` | DONE `features/settings/SettingsScreen.tsx` | |
| High contrast | `SettingsModal.tsx`, `a11y.ts` | DONE | |
| Note that text size follows iOS | `SettingsModal.tsx` | IMPLIED P11 (text scaling) | |
| Units (metric / imperial) | `SettingsModal.tsx` | DONE (with Australian measures note) | |
| Cooking: diet | `PreferenceEditorSheet.tsx` | DONE `features/settings/FoodSettings.tsx` | |
| Cooking: avoid list | `PreferenceEditorSheet.tsx` | DONE `FoodSettings.tsx` | |
| Cooking: cuisines, weeknight time, skill (each editable alone) | `PreferenceEditorSheet.tsx` | MISSING (M4) | |
| Redo welcome flow | `SettingsModal.tsx` | DONE ("Retake the taste quiz") | |
| Sunday planning reminder | none | DONE | v2 only. |
| Notifications: push master, likes/comments/follows, messages | `SettingsModal.tsx` | MISSING (M6) | |
| Weekly recipe digest (email) | `SettingsModal.tsx` | DON'T COPY | No email existed. |
| Private account | `SettingsModal.tsx` | DON'T COPY (or decide) | UI-only; never enforced. |
| Crash & diagnostics reports switch | `SettingsModal.tsx` | MISSING (M5) | |
| Export my data | `SettingsModal.tsx`, `data/dataExport.ts` | MISSING (M2) | |
| Pantry Pro status + Start/Manage | `SettingsModal.tsx` | MISSING (M9) | |
| Developer Pro override (dev builds only) | `SettingsModal.tsx`, `store.devToggleProMode` | IMPLIED P10 | Useful for testing gates; keep dev-only. |
| Version | `SettingsModal.tsx` | DONE | |
| Terms of Service, Privacy Policy | `SettingsModal.tsx` | MISSING (M3) | |
| Sign out | `SettingsModal.tsx` | MISSING (M7) | |
| Delete account | `SettingsModal.tsx`, `HomeScreen.tsx` | MISSING (M8) | |
| Design gallery (dev only) | none | DONE | v2 only. |

## 14. Accounts and profiles (P8)

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Sign in with Apple (name only on first grant) | `auth/socialLogin.ts`, `screens/SignInScreen.tsx` | PLANNED P8 | |
| Sign in with Google | `auth/socialLogin.ts` | PLANNED P8 | |
| Email sign in / create account tabs, validation | `screens/SignInScreen.tsx`, `lib/auth.ts` | PLANNED P8 | |
| Photo at sign-up | `SignInScreen.tsx` | IMPLIED P8 | |
| "Check your email to confirm" state | `SignInScreen.tsx` | IMPLIED P8 | |
| Forgot password | `SignInScreen.tsx` (stub) | MISSING (M10) | |
| Email confirmation deep link | `TODO.md` | MISSING (M11) | |
| Session stored securely | `lib/secureSessionStorage.ts` | PLANNED P8 (expo-secure-store) | |
| Auto sign-out toast when the session is lost | `HomeScreen.tsx` reconcile | IMPLIED P8 | |
| First sign-in forces choosing a username if the server gave a default `user_xxxx` | `HomeScreen.tsx`, `lib/handle.ts:isDefaultHandle`, `screens/ProfileSetupModal.tsx` | PLANNED P8 (handles) | |
| Profile setup/edit: photo (upload, remove), emoji avatar, name, @username with live availability check, bio | `ProfileSetupModal.tsx` | PLANNED P8 | Emoji avatars: rule 8 says emoji only where v1 shows them; keep tokenised. |
| Handle rules (3–24 chars, derived from name) | `lib/handle.ts` | PLANNED P8 | |
| Old local profile editor (name + email) | `screens/ProfileModal.tsx` | DON'T COPY | Pre-auth stand-in. |
| Sign out everywhere, RevenueCat logout on sign-out | `auth/signOutEverywhere.ts` | MISSING (M7) | |
| Delete account | `supabase/functions/delete-account` | MISSING (M8) | |

## 15. Social (P9)

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Create a bite: up to 5 photos/videos (≤60 s), camera or library, compressed, first is cover | `screens/CreatePostModal.tsx`, `data/compressMedia.ts`, `components/PhotoSourceSheet.tsx` | PLANNED P9 | |
| Title, caption (2,200), minutes and serves steppers, difficulty, up to 3 tags | `CreatePostModal.tsx` | PLANNED P9 | |
| Optional ingredients (with ingredient-database suggestions) and steps | `CreatePostModal.tsx` | IMPLIED P9 | |
| Live preview card | `CreatePostModal.tsx` | IMPLIED P9 | |
| Draft saved automatically, per account (text only) | `CreatePostModal.tsx` | IMPLIED P9 | |
| "Sign in first" state | `CreatePostModal.tsx` | IMPLIED P9 | |
| Also save the bite to My recipes | none | PLANNED P9 (D-027) | v2 only. |
| Post detail: author header, photo, like, jump to comments, send, add to list, add to plan, save; likes count; meta; caption | `screens/PostDetailModal.tsx` | PLANNED P9 | v1 showed only the first photo and couldn't play video in detail (bug). |
| "View recipe" → catalogue recipe, or a full recipe page built from the bite | `PostDetailModal.tsx`, `screens/PostRecipeModal.tsx` | IMPLIED P9 | |
| Bite recipe page: stats, servings, Cook Mode, HAVE badges, comments | `PostRecipeModal.tsx` | IMPLIED P9 | |
| Comments with report on each; composer; "Sign in to comment" banner | `PostDetailModal.tsx` | PLANNED P9 | |
| ⋯ on a post: delete your own (confirm); report; block author | `PostDetailModal.tsx` | PLANNED P9 | |
| "Post unavailable" state | `PostDetailModal.tsx` | IMPLIED P9 | |
| Post menu sheet (view profile, send, share, copy link, block, report, delete) | `screens/PostMenuSheet.tsx` | DON'T COPY as-is | Never opened in v1; "Copy link" did nothing. Rebuild the menu in P9 from the post detail's actions. |
| Likes (a like also saves? handover says "a like saves the recipe") | `social/useFeed.ts:useLikeState` | PLANNED P9 | Settle whether a like saves to Cookmarks. |
| Save bites | `useSaveState`, `bite_bookmarks` | PLANNED P9 | |
| Profile page (cookbook style): handle, "RECIPES BY", name, bio, stats (bites, followers, following), photo grid | `screens/UserProfileModal.tsx` | PLANNED P9 | |
| Follow / unfollow; follower and following lists | `UserProfileModal.tsx`, `screens/FollowListModal.tsx` | PLANNED P9 | |
| Message button on a profile (opens or creates the thread) | `UserProfileModal.tsx`, `HomeScreen.tsx` | PLANNED P9 | |
| Edit profile (own) and share profile | `UserProfileModal.tsx` | PLANNED P8/P9 | Share needs a real link (M16). |
| Block / unblock / report account; "Blocked" state | `UserProfileModal.tsx` | PLANNED P9 | |
| Inbox with Messages and Notifications tabs, new-message button | `screens/InboxModal.tsx` | PLANNED P9 | |
| Conversations list with last message preview and unread | `InboxModal.tsx` | PLANNED P9 | |
| New message: search people, open thread | `screens/ComposeMessageSheet.tsx` | PLANNED P9 | |
| Thread: bubbles, send, mark read, shared-post card | `screens/ThreadModal.tsx` | PLANNED P9 | v1 had no realtime; P9 adds it (rule 3). |
| Send a bite to someone with an optional note | `screens/SendToSheet.tsx` | PLANNED P9 ("send to") | |
| Notifications: likes, comments, follows, with type icon; tap to open | `InboxModal.tsx`, `social/notifications.ts` | PLANNED P9 | Standalone `NotificationsModal.tsx` was dead code. |
| Push token registration and Android channels | `push/pushClient.ts` | PLANNED P9 | Nothing ever sent a push in v1. |
| Report post, comment, account | `social/useFeed.ts` | PLANNED P9 | |
| Two-way blocking | `social/useFeed.ts`, `supabase/migrations/0002` | PLANNED P8/P9 (rule 5) | |
| Server-kept follower counts, locked handle, uneditable DMs | `supabase/migrations/0008`, `0011` | PLANNED P8 (rule 5) | |
| Browse "Trending this week", People tab | `BrowseModal.tsx` | PLANNED P9 | |

## 16. Pro and AI (P10)

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Paywall sheet with per-feature hero copy | `screens/PaywallModal.tsx`, `data/pro.ts` | PLANNED P10 | |
| Benefits list | `data/pro.ts:PRO_BENEFITS` | PLANNED P10 | List only what Pro really does (DON'T COPY v1's list). |
| Monthly $4.99 / Yearly $44.99 tiles, live prices from RevenueCat, "Save 25%" | `PaywallModal.tsx`, `pro/purchases.ts` | PLANNED P10 | |
| Purchase, "went through but didn't unlock" recovery message | `PaywallModal.tsx` | PLANNED P10 | |
| Restore purchases | `PaywallModal.tsx` | PLANNED P10 | |
| Subscription terms footer and legal links; Maybe later | `PaywallModal.tsx`, `data/pro.ts:SUBSCRIPTION_TERMS` | PLANNED P10 | |
| Entitlement synced from RevenueCat, never trusted from storage | `pro/usePurchasesSync.ts`, `store/useStore.ts` | PLANNED P10 | |
| Pro gates: next week's plan, >3 collections, nutrition detail | v1 gated planner, Cook Mode, scans | PLANNED P10 (D-003) | "Nutrition detail" depends on M12. |
| Pantry photo scan → review sheet (confidence pre-ticks, rename, untick) → add to cupboard | `pro/pantryScan/PantryScanFlow.tsx`, `ScanReviewSheet.tsx`, `pro/ai/identifyIngredients.ts` | PLANNED P10 | |
| Receipt scan (shows store name, all items pre-ticked) | same | PLANNED P10 | |
| AI proxy: Pro check, rate limit, 30 s timeout | `supabase/functions/ai-proxy`, `migrations/0012` | PLANNED P10 | |

## 17. Platform, quality and privacy

| Feature | Where in v1 | v2 status | Notes |
|---|---|---|---|
| Sentry crash reporting, user id attached, release | `lib/sentry.ts`, `App.tsx` | PLANNED P11 (K-8) | |
| Screen-load timing (TTID/TTFD) | `lib/screenTracing.ts` | IMPLIED P11 | |
| Logger that scrubs | `lib/logger.ts` | IMPLIED P11 | |
| Refetch when the app returns to the foreground | `lib/queryClient.ts` | PLANNED P8/P9 (rule 3) | |
| Haptics: spinner result, timer done, Cook Mode step | `SpinnerModal.tsx`, `StepText.tsx`, `CookModeModal.tsx` | PARTIAL (spinner, timers DONE; Cook Mode step IMPLIED P6) | |
| Reduce Motion respected | `SpinnerModal.tsx` | DONE (spinner, Cook Mode) | |
| Accessibility labels and roles | throughout | DONE for built screens; PLANNED P11 | |
| Dark mode, high contrast | `theme.ts`, `a11y.ts` | DONE `ui/theme/ThemeProvider.tsx` | v2 fixes v1's light-only tints. |
| Privacy manifest | `app.json` (`privacyManifests`) | PLANNED P11 | v2's is empty today, correct for local-only. |
| Legal documents | `legal/PRIVACY.md`, `legal/TERMS.md`, `legal/web/` | PLANNED P11 / P9 ("terms") | Rewrite to match what v2 actually does. |
| OTA updates on the right runtime | `app.json` | DONE (D-017, `runtimeVersion` appVersion); fingerprint PLANNED P11 | |
| iPad | `app.json` `supportsTablet: true` | MISSING (M21) | |

---

## DON'T COPY: v1 things that were dead, fake or a bad idea

| What | Where in v1 | Why not |
|---|---|---|
| Every screen a `<Modal>`, about 30 always mounted, with a "matte" overlay | `screens/HomeScreen.tsx` | Caused the June freeze and invisible touch-blocking overlays (rule 1 already covers it). |
| One big state object passed to every screen | `store/useStore.ts` | Every tick re-rendered the app (rule 2). |
| Simulated users, bites, notifications and seed data | `social/simulatedData.ts`, `social/localFeedApi.ts`, `social/notifications.ts`, `supabase/seeds/` | Fake content (rule 4). The Browse People tab listed simulated users even in cloud mode. |
| Fake spinner metadata: "@handle" made from the recipe id; "Similar to X dishes you liked"; "mostly hands-off" | `SpinnerModal.tsx:handleForMeal`, reasons | Claims the app can't back up. |
| Spinner "From cupboard" = recipes with 6 or fewer ingredients | `SpinnerModal.tsx` | A stand-in pretending to be a feature. |
| "EDITOR'S PICK" on every one of the top 5 feed posts | `FeedScreen.tsx:HeroCard` | There's no editor; it's just ranking. |
| Like and follower counts shown as `count + (liked ? 1 : 0)` | `FeedScreen.tsx`, `PostDetailModal.tsx`, `UserProfileModal.tsx` | Double-counts once the server count already includes your like. Counts must come from the database (rule 5). |
| Private account switch | `SettingsModal.tsx`, `store.privateAccount` | Never enforced. If wanted, it's a real feature needing server rules and a follow-request flow: decide first. |
| Weekly recipe digest (email) switch | `SettingsModal.tsx` | No email system existed. |
| Onboarding primer promising "we'll remind you to start X in time to eat" | `OnboardingModal.tsx:NotifStep` | Nothing was ever scheduled, and no server sent pushes. |
| Paywall benefits: AI recipe builder, allergen filtering, recipe of the day, grocery export | `data/pro.ts` | None were gated or existed; an App Review rejection risk (PRODUCT §7.7). |
| "Manage subscription" opening the paywall | `SettingsModal.tsx` | Should open Apple's subscription management. |
| Post menu sheet (including a dead "Copy link") | `screens/PostMenuSheet.tsx` | Never opened; dead buttons. |
| Dead screens and components: `NotificationsModal`, `SavedPostsModal`, `ResultDetailModal`, `Reel`, `SpinButton`, the "Favourites" and "Hidden" list routes | various | Unreachable code. |
| Hide dish with no way to hide | `store.toggleHidden` (no caller) | v1's hidden feature was half-built. v2 does it properly; add the list (M20). |
| Shopping list tick state that nothing displayed; "Reset week" with no button | `store.cartChecked`, `store.clearWeekPlan` | Dead state. |
| Plan by weekday; one slot per recipe per week; clearing a slot also deleting its shopping lines; removals hiding an ingredient by name forever | `store/useStore.ts`, `CartModal.tsx` | Fixed by D-009 and D-010. |
| Cuisine, diet, meal type, "in season", one-pot and quick chips guessed from the recipe *name* | `data/meals.ts`, `BrowseModal.tsx`, `data/season.ts`, `data/onePot.ts` | Wrong tags (paella as Middle Eastern). v2 uses real tags. |
| "Browse by your pantry" showing 4 random recipes | `BrowseModal.tsx` | Title didn't match content. |
| Filters sheet that only changed the spinner | `FiltersModal.tsx`, `store.visibleMeals` | Confusing; v2 applies filters to Browse. |
| Comments on built-in recipes keyed on a made-up id (`recipe:<id>`) | `RecipeModal.tsx:RecipeComments` | Failed in cloud mode. P9 needs a real recipe-comments table. |
| Unused `comments.rating` column (star ratings never shown) | `supabase/migrations/0003` | Either build ratings deliberately or leave the column out. |
| Deleting a collection only by a hidden long-press | `CollectionsModal.tsx` | Undiscoverable. v2 uses a button with undo. |
| Error screen printing the raw error message | `components/ErrorBoundary.tsx` | Rule 11: no raw error text to users. |
| Sign-in screen forced dark with its own hard-coded colours | `SignInScreen.tsx` | Breaks tokens-only (rule 7). |
| Avoid list framed as "Allergies" and matched by keywords | `OnboardingModal.tsx`, `data/preferences.ts` | Someone could get hurt (D-006). |
| Intents collected in onboarding and never used | `data/preferences.ts:intents` | Asking questions that change nothing. Use them (e.g. order the checklist) or drop the step. |
| Staples switch that reset every visit | `PantryModal.tsx` (local `useState`) | Persist it if kept. |
| Direct OpenAI key fallback in the client | `pro/ai/client.ts` | Key extractable from the bundle. |
| Cook Mode timers that stopped when the phone locked; Done that logged nothing | `StepText.tsx`, `CookModeModal.tsx` | Already fixed in v2. |
| Always-mounted recipe comments/likes calls per render, 3 copies each of post and profile screens | `HomeScreen.tsx` | Performance; Expo Router removes the need. |

---

## Counts

Counted row by row across sections 1–17 (285 feature rows). The MISSING and DON'T COPY tables at the top and bottom are summaries of the same ground, so they aren't added again.

| Status | Rows in §1–17 |
|---|---|
| DONE (including "DONE (diff)") | 127 |
| PARTIAL | 11 |
| PLANNED (named in a phase) | 77 |
| IMPLIED (phase covers the screen, item not named) | 37 |
| MISSING | 21 rows: 18 of the M-items (M7 and M8 each appear twice), plus "move a planned meal" (listed with the gaps neither app covers). M13, M16 and M19 show in the sections as DROPPED, DONE (diff) and PARTIAL, which makes the **21 items M1–M21** |
| DROPPED (by decision) | 4 |
| DON'T COPY | 7 (plus 31 rows in the DON'T COPY table) |
| n/a | 1 |

Headline: **DONE 127 · PLANNED 77 (+37 implied) · MISSING 21 (M1–M21)**, plus 11 partial, and 6 gaps neither app covers.
