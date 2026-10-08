// The recipes this cook eats: diet, the avoid list and "not for us" applied.
// Diet and avoid are hard rules everywhere (D-006), so Browse's results,
// search, the Filters count and Add to plan all start from here, the same as
// Browse's shelves and Surprise me. They used to start from everything, and
// a vegetarian saw 79 meat dishes behind a shelf that said 12 (BUG-07).
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { NO_FILTERS } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { eligibleForSurprise } from '@/domain/suggestions/surprise';
import { usePreferences } from './preferences';
import { useAllRecipes } from './recipeBook';
import { useSaved } from './saved';

export function useEatableRecipes(): Recipe[] {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  const recipes = useAllRecipes();
  return useMemo(
    () => eligibleForSurprise({ recipes, filters: NO_FILTERS, diet, avoid, hidden: new Set(hidden), index: INGREDIENTS }),
    [recipes, diet, avoid, hidden],
  );
}
