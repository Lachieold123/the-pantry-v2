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
