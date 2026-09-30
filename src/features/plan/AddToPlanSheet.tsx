// Add a meal to a chosen day: saved recipes first, then search the catalogue.
import { useRouter } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { fromISODate, isISODate, toISODate, type Slot } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { useAllRecipes, useRecipeLookup, useRecipeSearchIndex } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { SearchField } from '@/ui/primitives/SearchField';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

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
  const searchIndex = useRecipeSearchIndex();
  // The field updates on every letter; the results follow when there's time.
  const deferredQuery = useDeferredValue(query);

  const saved = useMemo(
    () => bookmarks.map((b) => getRecipe(b.recipeId)).filter((r): r is Recipe => r !== undefined),
    [bookmarks, getRecipe],
  );
  const results = useMemo(() => {
    const pool = deferredQuery.trim() ? searchRecipes(searchIndex(), deferredQuery) : all.filter((r) => r.mealTypes.includes(slot));
    return pool.filter((r) => !hidden.includes(r.id)).slice(0, MAX_RESULTS);
  }, [deferredQuery, slot, hidden, searchIndex, all]);

  const dayName = day === toISODate(new Date()) ? 'today' : (longDate(fromISODate(day)).split(' ')[0] ?? day);
  const pick = (recipe: Recipe) => {
    const entry = addEntry(recipe.id, day, slot, recipe.servings);
    toast({ message: `${recipe.title} planned for ${dayName} ${slot}`, undo: () => removeEntry(entry.id) });
    router.back();
  };

  return (
    <Sheet title={`Add to ${longDate(fromISODate(day))}`} onClose={() => router.back()}>
      <Segmented<Slot> label="Meal" options={SLOTS} value={slot} onChange={setSlot} />
      <SearchField value={query} onChange={setQuery} placeholder="Search recipes" label="Search recipes to plan" testID="add-plan-search" />
      {!query.trim() && saved.length ? (
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Saved" />
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
        <SectionHeader title={query.trim() ? 'Results' : `Ideas for ${slot}`} />
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
