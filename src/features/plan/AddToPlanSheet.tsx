// Add a meal to a chosen day: saved recipes first, then search the catalogue.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { indexForSearch, searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { fromISODate, isISODate, toISODate, type Slot } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { useAllRecipes, useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { useForYou } from '@/store/suggestions';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { useToast } from '@/ui/patterns/Toast';
import { SearchField } from '@/ui/primitives/SearchField';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { goBack } from '@/lib/navigation';

const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
] as const;
const MAX_RESULTS = 25;

export function AddToPlanSheet({ day: requested, slot: requestedSlot }: { day: string | undefined; slot?: string | undefined }) {
  // A malformed link falls back to today rather than crashing.
  const day = isISODate(requested) ? requested : toISODate(new Date());
  const router = useRouter();
  const toast = useToast();
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const bookmarks = useSaved((s) => s.bookmarks);
  const hidden = useSaved((s) => s.hidden);
  const [slot, setSlot] = useState<Slot>(() => SLOTS.find((s) => s.value === requestedSlot)?.value ?? 'dinner');
  const [query, setQuery] = useState('');
  const all = useAllRecipes();
  const getRecipe = useRecipeLookup();
  const searchIndex = useMemo(() => indexForSearch(all, (c) => CUISINE_LABELS[c]), [all]);

  const saved = useMemo(
    () => bookmarks.map((b) => getRecipe(b.recipeId)).filter((r): r is Recipe => r !== undefined),
    [bookmarks, getRecipe],
  );
  // Before a search, ideas that suit this cook (diet, taste, not planned or cooked lately), not the catalogue A–Z.
  const forYou = useForYou(MAX_RESULTS * 3);
  const results = useMemo(() => {
    const pool = query.trim() ? searchRecipes(searchIndex, query) : forYou.filter((r) => r.mealTypes.includes(slot));
    return pool.filter((r) => !hidden.includes(r.id)).slice(0, MAX_RESULTS);
  }, [query, slot, hidden, searchIndex, forYou]);

  const dayName = day === toISODate(new Date()) ? 'today' : (longDate(fromISODate(day)).split(' ')[0] ?? day);
  const pick = (recipe: Recipe) => {
    const entry = addEntry(recipe.id, day, slot, recipe.servings);
    toast({ message: `${recipe.title} planned for ${dayName} ${slot}`, undo: () => removeEntry(entry.id) });
    goBack(router);
  };

  return (
    <Sheet kicker="Plan" title={`Add ${slot} for ${dayName === 'today' ? 'today' : dayName}`} onClose={() => goBack(router)}>
      <Segmented<Slot> label="Meal" options={SLOTS} value={slot} onChange={setSlot} />
      <SearchField value={query} onChange={setQuery} placeholder="Search recipes" label="Search recipes to plan" testID="add-plan-search" />
      {!query.trim() && saved.length ? (
        <View style={{ gap: SPACE.sm }}>
          <Text variant="kickerSection" accessibilityRole="header">
            Saved
          </Text>
          {saved.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              image={RECIPE_IMAGES[r.id]}
              size="row"
              onPress={() => pick(r)}
              testID={`add-plan-saved-${r.id}`}
            />
          ))}
        </View>
      ) : null}
      <View style={{ gap: SPACE.sm }}>
        <Text variant="kickerSection" accessibilityRole="header">
          {query.trim() ? 'Results' : `Ideas for ${slot}`}
        </Text>
        {results.length === 0 ? (
          <Text variant="body" colour="inkSoft">
            No recipes match. Check the spelling, or try an ingredient.
          </Text>
        ) : null}
        {results.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            image={RECIPE_IMAGES[r.id]}
            size="row"
            onPress={() => pick(r)}
            testID={`add-plan-result-${r.id}`}
          />
        ))}
      </View>
    </Sheet>
  );
}
