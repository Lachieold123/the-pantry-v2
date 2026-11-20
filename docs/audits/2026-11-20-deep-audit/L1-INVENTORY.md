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

| file | lines | imports (from features/store/lib) | params / router targets | testIDs |
|---|---|---|---|---|
| (tabs)/_layout.tsx | 32 | features/app/useNeedsWelcome, features/shell/AppHeader, features/shell/TabBar, features/tour/TourOverlay | /welcome |  |
| (tabs)/cupboard.tsx | 4 | features/cupboard/CupboardScreen |  |  |
| (tabs)/index.tsx | 4 | features/feed/FeedScreen |  |  |
| (tabs)/list.tsx | 4 | features/shopping/ShoppingScreen |  |  |
| (tabs)/plan.tsx | 4 | features/plan/PlanScreen |  |  |
| +not-found.tsx | 4 | features/app/NotFoundScreen |  |  |
| _layout.tsx | 107 | features/account/AccountNudge, features/app/RootErrorScreen, features/app/useAppReady |  |  |
| account/email.tsx | 4 | features/account/EmailSheet |  |  |
| account/index.tsx | 9 | features/account/AccountSheet | useLocalSearchParams<{ moment?: string }> |  |
| browse.tsx | 10 | features/recipes/RecipesScreen | useLocalSearchParams<{ search?: string }> |  |
| collections/[id].tsx | 9 | features/saved/CollectionScreen | useLocalSearchParams<{ id: string }> |  |
| collections/index.tsx | 7 | features/saved/LibraryScreen |  |  |
| cooks/[id].tsx | 9 | features/feed/CookScreen | useLocalSearchParams<{ id: string }> |  |
| cupboard/add-list.tsx | 4 | features/cupboard/AddListSheet |  |  |
| cupboard/cookable.tsx | 4 | features/cupboard/CookableList |  |  |
| cupboard/scan.tsx | 9 | features/cupboard/ScanSheet | useLocalSearchParams<{ kind?: string }> |  |
| cupboard/shelf.tsx | 4 | features/cupboard/ShelfSheet |  |  |
| dev/gallery.tsx | 9 | features/dev/GalleryScreen | / |  |
| dev/home-viewer.tsx | 11 | features/dev/HomeViewerScreen | / |  |
| feed/[id].tsx | 9 | features/recipe/PublishedRecipeScreen | useLocalSearchParams<{ id: string }> |  |
| feed/index.tsx | 4 | features/feed/CommunityFeedScreen |  |  |
| filters.tsx | 4 | features/recipes/FiltersScreen |  |  |
| household.tsx | 4 | features/household/HouseholdScreen |  |  |
| join/[code].tsx | 9 | features/household/JoinScreen | useLocalSearchParams<{ code: string }> |  |
| library.tsx | 9 | features/saved/LibraryScreen | useLocalSearchParams<{ tab?: string }> |  |
| menu.tsx | 4 | features/shell/DrawerScreen |  |  |
| my-recipe/edit.tsx | 8 | features/editor/RecipeEditorScreen | useLocalSearchParams<{ id?: string; from?: string; title?: string }> |  |
| my-recipe/import.tsx | 4 | features/editor/ImportLinkScreen |  |  |
| my-recipes.tsx | 7 | features/saved/LibraryScreen |  |  |
| plan/add.tsx | 9 | features/plan/AddToPlanSheet | useLocalSearchParams<{ day: string; slot?: string }> |  |
| plate/[id].tsx | 9 | features/plates/PlateScreen | useLocalSearchParams<{ id: string }> |  |
| post.tsx | 4 | features/plates/PostScreen |  |  |
| pro.tsx | 9 | features/pro/PaywallScreen | useLocalSearchParams<{ from?: string }> |  |
| recent.tsx | 7 | features/saved/LibraryScreen |  |  |
| recipe/[id]/collect.tsx | 9 | features/recipe/CollectSheet | useLocalSearchParams<{ id: string }> |  |
| recipe/[id]/cook.tsx | 9 | features/cook/CookScreen | useLocalSearchParams<{ id: string; servings?: string }> |  |
| recipe/[id]/index.tsx | 9 | features/recipe/RecipeScreen | useLocalSearchParams<{ id: string }> |  |
| recipe/[id]/list.tsx | 10 | features/recipe/AddToListSheet | useLocalSearchParams<{ id: string; servings?: string }> |  |
| recipe/[id]/plan.tsx | 9 | features/recipe/PlanRecipeSheet | useLocalSearchParams<{ id: string }> |  |
| saved/index.tsx | 7 | features/saved/LibraryScreen |  |  |
| settings/index.tsx | 4 | features/settings/SettingsScreen |  |  |
| stats.tsx | 4 | features/saved/StatsScreen |  |  |
| surprise.tsx | 4 | features/surprise/SurpriseScreen |  |  |
| welcome.tsx | 4 | features/welcome/WelcomeScreen |  |  |

## 2. Screens and their testIDs (generated)

One row per feature file that sets a `testID`. Dynamic ids (such as `recipe-card-${id}`) are listed with their template. Feature folder contents:

```
account: AccountNudge.tsx AccountSheet.tsx AppleButton.tsx CodeStep.tsx EmailSheet.tsx words.ts
app: NotFoundScreen.tsx RootErrorScreen.tsx useAppReady.ts useNeedsWelcome.ts
cook: CookFooter.tsx CookHeader.tsx CookIngredientsSheet.tsx CookScreen.tsx CookStep.tsx TimerBar.tsx UsedUpSheet.tsx useCookTimers.ts
cupboard: AddListSheet.tsx CookableList.tsx CupboardLists.tsx CupboardParts.tsx CupboardScreen.tsx CupboardSettings.tsx ListReview.tsx MatchShelves.tsx ScanSheet.tsx ShelfSheet.tsx WaysIn.tsx
dev: GalleryParts.tsx GalleryScreen.tsx HomeViewerScreen.tsx
editor: EditorDetails.tsx ImportLinkScreen.tsx RecipeEditorScreen.tsx useRecipeEditor.ts
feed: CommunityFeedScreen.tsx CommunityRail.tsx CookScreen.tsx FeedScreen.tsx FirstRunChecklist.tsx HeroCarousel.tsx HomeEmpty.tsx HomeForYou.tsx HomeTiers.tsx PantrySwitch.tsx PlatesRail.tsx PublishedCard.tsx PublishedList.tsx
household: HouseholdScreen.tsx JoinScreen.tsx Members.tsx words.ts
plan: AddToPlanSheet.tsx DaySlots.tsx PlanParts.tsx PlanScreen.tsx WeekStrip.tsx
plates: PlateScreen.tsx PostScreen.tsx
pro: BuyPanel.tsx PaywallScreen.tsx PlanChoice.tsx
recipe: AddToListSheet.tsx CollectSheet.tsx CupboardSummary.tsx PhotoCredit.tsx PlanRecipeSheet.tsx PublishedRecipeScreen.tsx RecipeBody.tsx RecipeHeader.tsx RecipeScreen.tsx ServingsSheet.tsx SourceCredit.tsx weekChoices.ts
recipes: BrowseSections.tsx FiltersScreen.tsx RecipesScreen.tsx useRecipeResults.ts
saved: CollectionActions.tsx CollectionScreen.tsx CollectionsTab.tsx CookmarksTab.tsx LibraryScreen.tsx LibraryTabs.tsx MyRecipesEntry.tsx MyRecipesTab.tsx RecentTab.tsx StatsScreen.tsx libraryHooks.ts
settings: AccountSection.tsx CookingSection.tsx DeleteAccount.tsx LegalRows.tsx PreferenceEditors.tsx ProSection.tsx SettingsParts.tsx SettingsScreen.tsx SharingSection.tsx accountWords.ts
shell: AppHeader.tsx DrawerRow.tsx DrawerScreen.tsx TabBar.tsx useCounts.ts useKeyboardShown.ts
shopping: ShoppingListView.tsx ShoppingRows.tsx ShoppingScreen.tsx
surprise: SpinDeck.tsx SurpriseParts.tsx SurpriseScreen.tsx useSurprise.ts
tour: TourOverlay.tsx steps.ts useSettledTarget.ts
welcome: Consent.tsx CupboardStep.tsx EatStep.tsx OnVideo.tsx RevealSteps.tsx TasteSteps.tsx WelcomeFrame.tsx WelcomeScreen.tsx
```

| file | testIDs |
|---|---|
| features/account/AccountSheet.tsx | account-done, account-unavailable, account-pitch, account-apple-pending, account-email, account-problem, account-not-now |
| features/account/AppleButton.tsx | account-apple-busy, account-apple |
| features/account/CodeStep.tsx | account-code-sent, account-code, account-code-problem, account-verify, account-resend, account-change-email |
| features/account/EmailSheet.tsx | account-email-soon, account-done, account-email-field, account-problem, account-send |
| features/app/NotFoundScreen.tsx | not-found |
| features/cook/CookFooter.tsx | cook-back |
| features/cook/CookHeader.tsx | cook-close, cook-ingredients, cook-counter |
| features/cook/CookIngredientsSheet.tsx | sheet-backdrop, cook-ingredients-sheet, cook-ingredients-done |
| features/cook/CookScreen.tsx | cook-missing, cook-step |
| features/cook/CookStep.tsx | cook-step-text |
| features/cook/TimerBar.tsx | cook-timer-${t.id}, cook-timer-${t.id}-dismiss |
| features/cook/UsedUpSheet.tsx | used-up-sheet, used-up-${id}, used-up-none, used-up-done |
| features/cupboard/AddListSheet.tsx | add-list-input, add-list-read, add-list-edit, add-list-commit |
| features/cupboard/CookableList.tsx | cookable-list |
| features/cupboard/CupboardLists.tsx | jar-group-${g.category}, cupboard-item-${id}, quick-add-${id} |
| features/cupboard/CupboardParts.tsx | cupboard-search, cupboard-add-${r.id} |
| features/cupboard/CupboardScreen.tsx | cupboard-screen, cupboard-empty, cupboard-clear |
| features/cupboard/CupboardSettings.tsx | cupboard-shelf, cupboard-move-ticked, cupboard-staples-row, cupboard-staples, cupboard-oil, cupboard-substitutes |
| features/cupboard/ListReview.tsx | ${testIDPrefix}-item-${id} |
| features/cupboard/MatchShelves.tsx | ${prefix}${c.recipe.id}, cupboard-no-matches, cupboard-from-saved, cupboard-suggested, cupboard-see-all |
| features/cupboard/ScanSheet.tsx | scan-choose, scan-allowance, scan-problem, scan-camera, scan-library, scan-reading, scan-review, scan-commit, scan-not-yet, scan-use-list, scan-not-now |
| features/cupboard/ShelfSheet.tsx | shelf-${id} |
| features/cupboard/WaysIn.tsx | cupboard-add-list, cupboard-scan-receipt, cupboard-scan-food |
| features/dev/GalleryParts.tsx | gallery-chip-vegetarian, gallery-chip-quick, gallery-stepper, gallery-checkbox, gallery-switch, gallery-field, gallery-field-error, gallery-card-large, gallery-card-medium, gallery-card-long-title, gallery-card-row |
| features/dev/GalleryScreen.tsx | gallery-close, gallery-high-contrast, gallery-primary, gallery-secondary, gallery-quiet, gallery-destructive, gallery-row-detail, gallery-row-value, gallery-empty |
| features/dev/HomeViewerScreen.tsx | home-viewer-screen, home-viewer-me, home-viewer-retry, home-viewer-${c.handle} |
| features/editor/EditorDetails.tsx | editor-cuisine-${c}, editor-meal-${m}, editor-prep, editor-cook, editor-servings, editor-one-pot |
| features/editor/ImportLinkScreen.tsx | import-link, import-submit, import-write-by-hand |
| features/editor/RecipeEditorScreen.tsx | editor-missing, editor-cancel, editor-save, editor-save-draft, editor-keep-editing, editor-discard, editor-title, editor-summary, editor-ingredients, editor-method, editor-notes, editor-keep, editor-confirm-delete, editor-delete |
| features/feed/CommunityFeedScreen.tsx | community-feed |
| features/feed/CommunityRail.tsx | home-community, home-community-loading, home-community-error, home-community-retry, home-community-more |
| features/feed/CookScreen.tsx | cook-loading, cook-error, cook-retry, cook-screen, cook-counts, cook-follow |
| features/feed/FeedScreen.tsx | feed-screen, welcome-back-dismiss, home-nearly-note, home-nearly, home-browse-all |
| features/feed/FirstRunChecklist.tsx | checklist, checklist-count, checklist-dismiss, checklist-${id} |
| features/feed/HeroCarousel.tsx | home-heroes, home-hero-${recipe.id} |
| features/feed/HomeEmpty.tsx | home-pantry-empty, home-no-match, home-pantry-none, feed-empty |
| features/feed/HomeForYou.tsx | home-for-you, home-viewing-as, home-viewing-as-change, home-for-you-loading, home-for-you-error, home-for-you-retry, home-for-you-more, home-reason-${id}, home-hide-${id} |
| features/feed/HomeTiers.tsx | home-tiers, home-can-cook, home-missing-few, ${testID}-${row.item.id}, ${testID}-toggle |
| features/feed/PantrySwitch.tsx | home-mode-pantry, home-mode-all, home-search, home-pantry-line |
| features/feed/PlatesRail.tsx | home-plates, home-plates-add, home-plate-${p.id} |
| features/feed/PublishedCard.tsx | published-${item.id}, published-cook-${item.id}, published-open-${item.id}, published-credit-${item.id} |
| features/feed/PublishedList.tsx | feed-loading, feed-error, feed-retry, feed-empty, feed-end |
| features/household/HouseholdScreen.tsx | household-screen, household-rejoin, household-name, household-start, household-code, household-join, household-problem, household-status, household-invite, household-cancel-invites, household-leave-confirm, household-leave-cancel, household-leave |
| features/household/JoinScreen.tsx | join-open-household, join-preview, join-preview-missing, join-name, join-confirm, join-problem |
| features/household/Members.tsx | household-members, household-remove-${m.userId}, household-remove-confirm, household-remove-cancel |
| features/plan/AddToPlanSheet.tsx | add-plan-search, add-plan-saved-${r.id}, add-plan-result-${r.id} |
| features/plan/DaySlots.tsx | plan-add-${day}-${slot}, plan-entry-${entry.id}-remove, plan-entry-${entry.id}, plan-entry-${entry.id}-servings, plan-servings-sheet, plan-entry-${entry.id}-stepper, plan-servings-done |
| features/plan/PlanParts.tsx | plan-progress, plan-suggest-${recipe.id}, plan-list-card |
| features/plan/PlanScreen.tsx | plan-screen, plan-share, plan-day-heading, plan-pro-nudge |
| features/plan/WeekStrip.tsx | plan-day-${day} |
| features/plates/PlateScreen.tsx | plate-missing, plate-screen, plate-recipe, plate-remove |
| features/plates/PostScreen.tsx | post-screen, post-close, post-share, post-problems, post-add-photo, post-remove-photo-${i}, post-photo-problem, post-title, post-unlink, post-link-${r.id}, post-caption, post-minutes, post-serves, post-difficulty-${level}, post-preview, post-discard, post-camera, post-library |
| features/pro/BuyPanel.tsx | pro-${notice.tone}, pro-buy, pro-terms, pro-restore |
| features/pro/PaywallScreen.tsx | pro-benefits, pro-done, pro-loading, pro-load-failed, pro-retry, pro-not-on-sale, pro-check-again |
| features/pro/PlanChoice.tsx | pro-plan-${plan.id}, pro-plan-${plan.id}-price |
| features/recipe/AddToListSheet.tsx | list-servings, list-already, list-confirm, list-row-${r.key.replace(/[^a-z0-9-]/g, '-')} |
| features/recipe/CollectSheet.tsx | collect-row-${c.id}, collect-new-name, collect-create |
| features/recipe/CupboardSummary.tsx | recipe-cupboard-summary, recipe-add-missing, recipe-have-missing |
| features/recipe/PhotoCredit.tsx | recipe-photo-credit, recipe-photo-${l.id} |
| features/recipe/PlanRecipeSheet.tsx | plan-day-${w.key}-${i}, plan-servings, plan-confirm |
| features/recipe/PublishedRecipeScreen.tsx | published-loading, published-error, published-retry, published-recipe-screen, published-caption, recipe-photo-credit, back |
| features/recipe/RecipeBody.tsx | recipe-add-to-list, ingredient-${key} |
| features/recipe/RecipeHeader.tsx | recipe-edit, recipe-author, recipe-save, recipe-plan, recipe-share, recipe-mark-cooked, recipe-servings, recipe-cook |
| features/recipe/RecipeScreen.tsx | recipe-missing, recipe-screen, recipe-origin, back, recipe-more, action-plan, action-collect, action-share, action-edit, action-hide |
| features/recipe/ServingsSheet.tsx | servings-sheet, servings-stepper, servings-reset, servings-done |
| features/recipe/SourceCredit.tsx | recipe-source-credit |
| features/recipes/BrowseSections.tsx | browse-featured, chip-${chip.id}, mood-${mood.id}, browse-cupboard-all, browse-see-all |
| features/recipes/FiltersScreen.tsx | filters-screen, filters-back, filters-count, filter-cuisine-${c}, filter-diet-${d.value}, filter-meal-${m}, filter-time-${t.value}, filter-difficulty-${d}, filter-one-pot, filter-in-season, filters-clear, filters-show |
| features/recipes/RecipesScreen.tsx | browse-add-recipe, browse-search, browse-filters, browse-pill, browse-clear, browse-empty |
| features/saved/CollectionActions.tsx | collection-rename, collection-delete |
| features/saved/CollectionScreen.tsx | collection-screen, collection-missing, collection-more, collection-empty |
| features/saved/CollectionsTab.tsx | collections-screen, collections-new, collections-empty |
| features/saved/CookmarksTab.tsx | cookmarks-empty |
| features/saved/LibraryScreen.tsx | library-screen, cookmarks-screen |
| features/saved/LibraryTabs.tsx | library-tab-${t} |
| features/saved/MyRecipesEntry.tsx | mine-entry, mine-name, mine-link, mine-write-by-hand |
| features/saved/MyRecipesTab.tsx | my-recipes-screen, mine-empty, mine-draft-${d.id}, mine-recipe-${m.id} |
| features/saved/RecentTab.tsx | recent-screen, recent-empty, recent-clear |
| features/saved/StatsScreen.tsx | stats-screen, stats-empty, stats-cuisines, stats-most-cooked, stats-clear, stats-week, stats-total, stats-best |
| features/settings/AccountSection.tsx | settings-account, settings-account-backup, settings-account-unavailable, settings-account-who, settings-account-backed-up, settings-sign-out-problem, settings-sign-out-confirm, settings-sign-out-cancel, settings-sign-out |
| features/settings/CookingSection.tsx | settings-cooking-diet, settings-cooking-avoid, settings-cooking-cuisines, settings-cooking-weeknight, settings-cooking-skill, settings-editor, settings-editor-done |
| features/settings/DeleteAccount.tsx | settings-delete-account, settings-delete-panel, settings-delete-confirm-field, settings-delete-problem, settings-delete-confirm, settings-delete-cancel |
| features/settings/LegalRows.tsx | settings-legal-${l.label} |
| features/settings/PreferenceEditors.tsx | settings-diet-${d}, settings-avoid-${o}, settings-avoid-custom-${c}, settings-avoid-word, settings-cuisine-${c}, settings-weeknight-${w}, settings-skill-${k} |
| features/settings/ProSection.tsx | settings-pro, settings-manage-subscription, settings-preview-limits, settings-pretend-pro |
| features/settings/SettingsParts.tsx | ${testID}-switch |
| features/settings/SettingsScreen.tsx | settings-screen, settings-high-contrast, settings-sunday-reminder, settings-gallery, settings-retake-quiz, settings-replay-tour |
| features/settings/SharingSection.tsx | settings-household |
| features/shell/AppHeader.tsx | header-menu, header-avatar |
| features/shell/DrawerScreen.tsx | menu-close, menu-feed, menu-browse, menu-cupboard, menu-saved, menu-collections, menu-my-recipes, menu-recent, menu-stats, menu-surprise, menu-plan, menu-list, menu-post, menu-add-recipe, menu-settings, menu-profile, menu-profile-sub |
| features/shell/TabBar.tsx | tab-${route.name}, tab-add |
| features/shopping/ShoppingListView.tsx | shopping-item-${item.key}, shopping-empty, shopping-count, shopping-by-aisle, shopping-clear, shopping-extra-${x.id}, shopping-restore, shopping-back-${item.key} |
| features/shopping/ShoppingRows.tsx | ${testID}-remove, shopping-add-extra |
| features/shopping/ShoppingScreen.tsx | shopping-screen, shopping-share, segment-${w}, shopping-shared |
| features/surprise/SpinDeck.tsx | surprise-card, surprise-title |
| features/surprise/SurpriseParts.tsx | surprise-back, surprise-counter, surprise-info, surprise-why, surprise-how, surprise-how-close |
| features/surprise/SurpriseScreen.tsx | surprise-screen, surprise-empty, surprise-spin, surprise-plan, surprise-cook |
| features/tour/TourOverlay.tsx | tour, tour-skip |
| features/welcome/Consent.tsx | welcome-consent, welcome-legal-${i} |
| features/welcome/CupboardStep.tsx | welcome-cupboard-${id}, welcome-cupboard-empty, welcome-cupboard-skip |
| features/welcome/EatStep.tsx | diet-${d}, avoid-${o} |
| features/welcome/RevealSteps.tsx | welcome-pick-${r.id}, welcome-spin, welcome-not-tonight, welcome-empty, welcome-change-answers, welcome-notify, welcome-allow, welcome-later |
| features/welcome/TasteSteps.tsx | intent-${i}, cuisine-${c}, weeknight-${w.value}, skill-${k} |
| features/welcome/WelcomeFrame.tsx | welcome-skip, welcome-start, welcome-note |
| features/welcome/WelcomeScreen.tsx | welcome-back, welcome-next |
| ui/patterns/ActionSheet.tsx | sheet-cancel |
| ui/patterns/CollectionMosaic.tsx | collection-card-${item.id} |
| ui/patterns/CollectionNameDialog.tsx | name-dialog-backdrop, name-dialog, name-dialog-input, name-dialog-cancel, name-dialog-save |
| ui/patterns/DropdownChips.tsx | ${testIDPrefix}-${d.key}, ${testIDPrefix}-option-${o.value ?? 'any'} |
| ui/patterns/EntryRow.tsx | ${testID}-submit, ${testID}-error |
| ui/patterns/ErrorState.tsx | error-retry |
| ui/patterns/LibraryCard.tsx | ${id}-save |
| ui/patterns/LibraryHeader.tsx | back |
| ui/patterns/ModalSheet.tsx | sheet-backdrop, modal-sheet-close |
| ui/patterns/PushedHeader.tsx | back |
| ui/patterns/RecipeCard.tsx | ${id}-save |
| ui/patterns/StatCards.tsx | stats-streak |
| ui/patterns/Toast.tsx | toast, toast-undo |
| ui/primitives/SearchField.tsx | ${testID}-clear |
| ui/primitives/Segmented.tsx | segment-${o.value} |
| ui/primitives/Sheet.tsx | sheet-close |

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

| module | lines | exports | importers (non-test files) | where | test |
|---|---|---|---|---|---|
| account/account.ts | 58 | 14 | 8 | features/account, features/settings, store/account.ts, store/accountActions.ts, store/accountSync.ts | yes |
| cook/cook.ts | 89 | 6 | 7 | domain/cook, domain/sync, features/cook, features/recipe, features/surprise | yes |
| cook/stats.ts | 111 | 7 | 1 | features/saved | yes |
| cook/timers.ts | 32 | 6 | 3 | features/cook | yes |
| cupboard/addList.ts | 27 | 2 | 3 | domain/cupboard, features/cupboard | yes |
| cupboard/cookable.ts | 204 | 15 | 23 | domain/cupboard, domain/home-engine, domain/suggestions, domain/testing, domain/welcome | yes |
| cupboard/kitchen.ts | 108 | 5 | 10 | data/catalogue, domain/cupboard, domain/home-engine, domain/sync, domain/testing | no |
| cupboard/match.ts | 21 | 3 | 9 | domain/sync, features/cook, features/recipe, features/welcome, lib/homeFeed.ts | yes |
| cupboard/scan.ts | 74 | 11 | 5 | domain/pro, features/cupboard, lib/scan.ts, store/scans.ts | yes |
| cupboard/shelves.ts | 67 | 6 | 2 | features/cupboard, store/cookable.ts | yes |
| cupboard/summary.ts | 56 | 4 | 2 | features/recipe | yes |
| home-engine/candidates.ts | 95 | 2 | 1 | domain/home-engine | no |
| home-engine/config.ts | 76 | 4 | 5 | domain/home-engine | no |
| home-engine/context.ts | 92 | 5 | 4 | domain/home-engine | no |
| home-engine/engine.ts | 49 | 3 | 1 | lib/homeFeed.ts | yes |
| home-engine/events.ts | 129 | 10 | 2 | domain/home-engine, store/homeEvents.ts | no |
| home-engine/explain.ts | 65 | 2 | 1 | domain/home-engine | no |
| home-engine/features.ts | 155 | 13 | 5 | domain/home-engine | no |
| home-engine/fromPublished.ts | 89 | 5 | 2 | lib/homeFeed.ts, lib/homeFeedReads.ts | no |
| home-engine/rank.ts | 57 | 5 | 3 | domain/home-engine, domain/suggestions, domain/testing | no |
| home-engine/rerank.ts | 44 | 2 | 1 | domain/home-engine | no |
| home-engine/simulate.ts | 151 | 11 | 0 |  | no |
| home-engine/types.ts | 93 | 10 | 52 | domain/cupboard, domain/home-engine, domain/ingredients, domain/legacy, domain/plates | no |
| household/rows.ts | 5 | 1 | 1 | lib/household.ts | yes |
| ingredients/database.ts | 120 | 8 | 22 | data/catalogue, domain/cupboard, domain/home-engine, domain/ingredients, domain/legacy | no |
| ingredients/format.ts | 92 | 4 | 7 | domain/shopping, features/cook, features/recipe, store/accountSync.ts, store/preferences.ts | no |
| ingredients/hierarchy.ts | 185 | 7 | 5 | data/catalogue, domain/cupboard, domain/home-engine, domain/testing | yes |
| ingredients/nouns.ts | 80 | 3 | 1 | domain/ingredients | no |
| ingredients/parse.ts | 140 | 1 | 4 | domain/cupboard, domain/recipes, domain/testing | yes |
| ingredients/quantity.ts | 106 | 10 | 11 | domain/cook, domain/ingredients, domain/published, domain/recipes, domain/shopping | no |
| ingredients/types.ts | 27 | 4 | 49 | domain/cupboard, domain/home-engine, domain/ingredients, domain/legacy, domain/plates | no |
| ingredients/units.ts | 138 | 7 | 9 | domain/ingredients, domain/published, domain/recipes, domain/shopping, domain/sync | no |
| legacy/oldApp.ts | 222 | 7 | 1 | store/oldAppImport.ts | yes |
| plan/summary.ts | 39 | 4 | 1 | features/plan | yes |
| plan/week.ts | 124 | 21 | 27 | domain/plan, domain/pro, domain/shopping, domain/suggestions, domain/sync | yes |
| plates/plate.ts | 94 | 10 | 4 | features/feed, features/plates, store/plates.ts | yes |
| pro/pro.ts | 143 | 15 | 7 | domain/pro, features/pro, lib/purchases.ts, store/pendingImport.ts, store/pro.ts | yes |
| pro/purchase.ts | 148 | 16 | 2 | lib/purchases.ts, store/pro.ts | yes |
| pro/terms.ts | 70 | 7 | 3 | domain/pro, features/pro | yes |
| published/published.ts | 242 | 21 | 7 | domain/home-engine, features/feed, lib/homeFeedReads.ts, lib/published.ts, lib/usePublished.ts | yes |
| recipes/browse.ts | 79 | 8 | 2 | features/recipes | yes |
| recipes/diets.ts | 99 | 7 | 12 | domain/legacy, domain/recipes, domain/suggestions, features/recipes, features/settings | no |
| recipes/draft.ts | 205 | 10 | 10 | domain/legacy, domain/recipes, features/editor, lib/useLinkImport.ts, store/myRecipes.ts | yes |
| recipes/importLink.ts | 193 | 7 | 4 | features/editor, features/recipe, lib/useLinkImport.ts | yes |
| recipes/labels.ts | 152 | 13 | 30 | domain/plates, domain/recipes, domain/suggestions, domain/testing, features/editor | no |
| recipes/photoCredit.ts | 64 | 5 | 1 | features/recipe | yes |
| recipes/provenance.ts | 13 | 1 | 1 | data/catalogue | yes |
| recipes/search.ts | 162 | 9 | 26 | domain/legacy, domain/recipes, domain/suggestions, domain/testing, features/feed | no |
| recipes/searchWords.ts | 81 | 3 | 1 | domain/recipes | no |
| recipes/stored.ts | 76 | 4 | 2 | store/accountSync.ts, store/household.ts | no |
| recipes/substitutions.ts | 39 | 2 | 2 | features/cook, features/recipe | no |
| recipes/types.ts | 96 | 17 | 84 | data/catalogue, domain/cupboard, domain/home-engine, domain/ingredients, domain/legacy | no |
| recipes/validate.ts | 62 | 2 | 1 | domain/recipes | no |
| shopping/amounts.ts | 119 | 7 | 3 | domain/shopping | no |
| shopping/derive.ts | 233 | 17 | 11 | domain/shopping, domain/sync, features/plan, features/recipe, features/shopping | yes |
| shopping/extras.ts | 66 | 3 | 3 | domain/shopping, features/shopping | no |
| shopping/fromRecipe.ts | 96 | 5 | 2 | features/recipe | yes |
| shopping/ticks.ts | 58 | 2 | 1 | domain/shopping | yes |
| suggestions/diversify.ts | 71 | 4 | 1 | domain/suggestions | yes |
| suggestions/home.ts | 138 | 12 | 6 | domain/suggestions, domain/testing, features/feed, store/suggestions.ts | yes |
| suggestions/jitter.ts | 14 | 1 | 3 | domain/cupboard, domain/recipes, domain/suggestions | yes |
| suggestions/moment.ts | 107 | 14 | 5 | domain/suggestions, domain/testing, store/suggestions.ts | yes |
| suggestions/rank.ts | 126 | 5 | 4 | domain/home-engine, domain/suggestions, domain/testing, store/suggestions.ts | yes |
| suggestions/score.ts | 279 | 11 | 2 | domain/suggestions, domain/testing | no |
| suggestions/signals.ts | 126 | 7 | 5 | domain/suggestions, domain/testing | yes |
| suggestions/slot.ts | 55 | 4 | 1 | store/suggestions.ts | yes |
| suggestions/surprise.ts | 63 | 4 | 7 | domain/suggestions, features/recipes, features/surprise, features/welcome, store/cookable.ts | yes |
| suggestions/surpriseDeck.ts | 107 | 10 | 3 | features/surprise | yes |
| sync/cursor.ts | 41 | 4 | 2 | store/sync.ts, store/syncTypes.ts | yes |
| sync/kitchen.ts | 112 | 6 | 6 | domain/cupboard, domain/home-engine, domain/sync, domain/testing, domain/welcome | yes |
| sync/limits.ts | 62 | 5 | 1 | store/sync.ts | no |
| sync/personal.ts | 129 | 10 | 1 | domain/sync | no |
| sync/rows.ts | 129 | 8 | 8 | domain/household, lib/account.ts, store/accountActions.ts, store/accountSync.ts, store/household.ts | yes |
| sync/types.ts | 46 | 9 | 52 | domain/cupboard, domain/home-engine, domain/ingredients, domain/legacy, domain/plates | no |
| testing/fixtures.ts | 42 | 8 | 1 | domain/testing | no |
| testing/home.ts | 117 | 7 | 1 | domain/suggestions | no |
| testing/published.ts | 61 | 3 | 3 | domain/home-engine, lib/homeFeedReads.ts, lib/usePublished.ts | no |
| welcome/checklist.ts | 54 | 5 | 2 | features/feed, store/checklist.ts | yes |
| welcome/cupboardPicks.ts | 40 | 3 | 2 | features/welcome | yes |
| welcome/onboarding.ts | 85 | 14 | 8 | domain/suggestions, domain/welcome, features/settings, features/welcome, store/preferences.ts | yes |

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

| migration | lines | first comment |
|---|---|---|
| migrations/20261006000000_households.sql | 160 | Households (D-039): a few people who share one kitchen — the week's plan, |
| migrations/20261006000100_household_rows_newest_wins.sql | 17 | A write that arrives late (a phone that was offline) must not overwrite a |
| migrations/20261006000200_accounts.sql | 93 | Accounts (D-043, docs/ACCOUNTS.md): Sign in with Apple or a 6-digit email |
| migrations/20261007011855_cooks_and_seed_kitchen.sql | 223 | Pulled from the remote project (supabase_migrations.schema_migrations) on |
| migrations/20261007014646_seed_kitchen_scheduler.sql | 38 | Pulled from the remote project (supabase_migrations.schema_migrations) on |
| migrations/20261008000000_household_lockdown.sql | 85 | Household lockdown (audit 8 October 2026, SEC-01, SEC-06, SEC-20, SEC-21). |
| migrations/20261008000100_rows_server_rules.sql | 135 | Row rules the server enforces (audit 8 October 2026, SEC-04, SEC-05, SEC-07, BUG-17, BUG-28). |
| migrations/20261008000200_invites.sql | 167 | Invite codes and members (audit 8 October 2026, SEC-08, SEC-15, SEC-16, D-045). |
| migrations/20261008000300_account_cleanup.sql | 69 | Deleting an account leaves nothing of you behind (audit 8 October 2026, SEC-13, SEC-14). |
| migrations/20261009000000_rows_received_at.sql | 79 | Pull only what changed (K-36). |
| migrations/20261009000100_realtime_private_broadcast.sql | 81 | Live rows over private Broadcast channels (K-32, SEC-06). |
| migrations/20261012000000_home_events.sql | 55 | Home engine, step 1: the interaction log (docs/HOME-ENGINE.md §6). |
| migrations/20261012000100_home_ranking.sql | 89 | Home engine, step 2: server-side signals and a first-stage ranker |
| migrations/20261017000000_seed_kitchen_retired.sql | 21 | The seed kitchen is retired (17 Oct 2026, Lachlan's Telegram msg 1498: no |
| migrations/_pending/20261021000000_seed_kitchen_off.sql | 24 | PENDING, NOT APPLIED. Lives in _pending/ so `supabase db push` never picks it up. |

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

| file | lines | first comment |
|---|---|---|
| scripts/apply-nutrition-13.mts | 226 | Per-serve nutrition for the 13 batch-03 recipes the line estimator could not do |
| scripts/batch-03.mts | 499 | Batch 03 (12 Oct 2026): turns the recipes the old Supabase generator |
| scripts/check-house-recipes.mts | 51 | Checks the new house recipe batches (D-044) without needing the old app, so |
| scripts/check-ingredient-coverage.mts | 154 | Checks how well the ingredient database covers real recipe lines. |
| scripts/check-recipe-text.mts | 34 | Reads every recipe in the built catalogue and checks its own words against |
| scripts/convert-old-recipes.mts | 231 | One-off conversion of the old app's free-text catalogue into v2's |
| scripts/dedupe-batch04.mts | 274 | Finds duplicate recipes in the batch-04 files (batch-04*.json), across files and |
| scripts/estimate-nutrition-from-lines.mts | 212 | Gives batch-01 to 03 house recipes (which had no nutrition) a per-serve nutrition |
| scripts/fix-nutrition-from-lines.mts | 143 | Rebuilds stated nutrition from the ingredient lines for batch-04 recipes that fail the |
| scripts/home-engine-sim.mts | 152 | The Home engine simulation. Takes the real published recipes, cooks and |
| scripts/house-recipes.mts | 223 | New house recipes written for v2 (D-044), kept apart from the old-app |
| scripts/merge-batch04.sh | 92 | Re-does the batch-04 merge when the slice branches gain commits. Run it from the |
| scripts/nutrition-estimate.mts | 372 | Rough per-serve energy estimate for house recipes, from the ingredient lines. |
| scripts/nutrition-estimate.test.mts | 149 |  |
| scripts/owner-upload-feed.mts | 369 |  |
| scripts/pantry-match-report.mts | 102 | "I put 72 things in my pantry and it says I can cook 4": before and after |
| scripts/published-snapshot.mts | 72 | Reads the published recipes, cooks and follows from Supabase with the app's |
| scripts/rebuild-house-batches.mts | 51 | Rebuilds the house-batch part of the catalogue without the old app (batch 03). |
| scripts/recipe-fix.mts | 136 | Applies one recipe's hand fixes from scripts/data/recipe-fixes.json to its |
| scripts/recipe-photos.mts | 102 | Writes the recipe photo maps from the catalogue (K-30). Metro bundles every |
| scripts/recipe-text-checks.mts | 90 | Checks a recipe's own words against its diet tags (from the 12 Oct pilot's |
| scripts/renormalise-nutrition.mts | 90 | Checks stated per-serve nutrition in house recipe files against the ingredient |
| scripts/run-maestro.command | 224 | Runs the whole Maestro suite (.maestro/) against The Pantry in Expo Go on the |
| scripts/validate-house-recipes.mts | 615 | The single gate for new house recipe batches (batch-04 on). It runs the |
| scripts/verify-feed-payload.mts | 247 |  |
| scripts/verify-feed-payload.test.mts | 92 |  |
| scripts/write-photo-sources.mts | 14 | Writes src/data/catalogue/photoSources.ts (each house photo's Wikimedia |

`scripts/data/` holds house recipe batches (`house-recipes/batch-01..04*.json`, 4 file families), batch-03 working files, `recipe-fixes.json`, `recipe-tags.json`, `shared-photos.json`, review files. `docs/backups/` holds 17 Oct feed payload chunks and Supabase table snapshots (about 5 MB tracked).

Tests: 99 test files (`inv-tests.txt`), 8 Playwright specs in `e2e/web` (`account, audit-fixes, cook-and-cupboard, first-run, home, library, plan-and-list, pro-and-household`), 26 Maestro flows plus 5 subflows in `.maestro` (run in Expo Go via `scripts/run-maestro.command`), 2 PGlite DB test files.

## 9. Test coverage by feature folder (generated)

Non-test files vs test files per folder (`src/features/*`, `src/store`). A zero here is a feature with no Jest test of its own; see L1-BASELINE section "Tests" for what the Playwright and Maestro suites add.

| feature | non-test files | test files |
|---|---|---|
| account | 6 | 1 |
| app | 4 | 0 |
| cook | 8 | 3 |
| cupboard | 11 | 2 |
| dev | 3 | 0 |
| editor | 4 | 1 |
| feed | 13 | 3 |
| household | 4 | 0 |
| plan | 5 | 0 |
| plates | 2 | 1 |
| pro | 3 | 1 |
| recipe | 12 | 6 |
| recipes | 4 | 1 |
| saved | 11 | 2 |
| settings | 10 | 4 |
| shell | 6 | 1 |
| shopping | 3 | 0 |
| surprise | 4 | 0 |
| tour | 3 | 1 |
| welcome | 8 | 1 |
| store | 31 | 6 |

## 10. Unused code candidates

From `inv-unused-exports.md` (a named export no other file in `src` mentions): 8 flagged; 5 belong to `home-engine/simulate.ts` (used by `scripts/home-engine-sim.mts`, so not dead). Truly unused: `domain/testing/fixtures.ts plainKitchen`, `lib/purchases.ts purchasesConfigured`, `lib/today.ts refreshToday`. A further 121 exports are used only inside their own file (`internal use only` rows in the evidence file). No `package.json` dependency is unused outright: `expo-asset`, `expo-dev-client`, `expo-linking`, `react-dom`, `react-native-web`, `react-native-worklets` are peers or platform pieces and are not imported by name.
