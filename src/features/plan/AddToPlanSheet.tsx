// Add a meal to a chosen day: saved recipes first, then search the catalogue.
import { useRouter } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { planWhere } from '@/domain/plan/summary';
import { searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { fromISODate, plannableDay, type Slot } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { goBackOr } from '@/lib/navigation';
import { useToday } from '@/lib/useToday';
import { usePlan } from '@/store/plan';
import { useRecipeLookup, useRecipeSearchIndex } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { useForYou } from '@/store/suggestions';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { useOnce } from '@/ui/patterns/useOnce';
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
  // A malformed or crafted link lands on a day the Plan tab shows, never the past or 2099 (F144).
  const today = useToday();
  const day = plannableDay(requested, today);
  const router = useRouter();
  const toast = useToast();
  const once = useOnce();
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const bookmarks = useSaved((s) => s.bookmarks);
  const hidden = useSaved((s) => s.hidden);
  const [slot, setSlot] = useState<Slot>(() => SLOTS.find((s) => s.value === requestedSlot)?.value ?? 'dinner');
  const [query, setQuery] = useState('');
  const getRecipe = useRecipeLookup();
  const searchIndex = useRecipeSearchIndex();
  // The field updates on every letter; the results follow when there's time.
  const deferredQuery = useDeferredValue(query);

  const saved = useMemo(
    () => bookmarks.map((b) => getRecipe(b.recipeId)).filter((r): r is Recipe => r !== undefined),
    [bookmarks, getRecipe],
  );
  // Ideas follow the cook's diet and avoid list and are ranked for them, like every other suggestion.
  // A search is an explicit ask, so it shows whatever matches (bar "not for us").
  const ideas = useForYou(MAX_RESULTS, slot);
  const results = useMemo(
    () =>
      deferredQuery.trim()
        ? searchRecipes(searchIndex(), deferredQuery)
            .filter((r) => !hidden.includes(r.id))
            .slice(0, MAX_RESULTS)
        : ideas,
    [deferredQuery, hidden, searchIndex, ideas],
  );

  // Once only: the sheet takes a moment to close, and a second tap would plan twice (audit F163).
  const pick = once((recipe: Recipe) => {
    const entry = addEntry(recipe.id, day, slot, recipe.servings);
    toast({ message: `${recipe.title} planned for ${planWhere(day, slot, today)}`, undo: () => removeEntry(entry.id) });
    goBackOr(router);
  });

  return (
    <Sheet title={`Add to ${longDate(fromISODate(day))}`} onClose={() => goBackOr(router)}>
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
            {query.trim()
              ? 'No recipes match. Check the spelling, or try an ingredient.'
              : `Nothing for ${slot} fits what you eat and avoid yet. Search to find something else.`}
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
