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
