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
