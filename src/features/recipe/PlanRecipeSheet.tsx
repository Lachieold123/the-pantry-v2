// Plan this recipe: pick a day, a meal and how many it's for (map §6).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Slot } from '@/domain/plan/week';
import { parseServings } from '@/domain/recipes/servings';
import { goBackOr } from '@/lib/navigation';
import { usePlan } from '@/store/plan';
import { useRecipe } from '@/store/recipeBook';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { useOnce } from '@/ui/patterns/useOnce';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { planningDays } from './weekChoices';

const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
] as const;

/** `servings` is the raw route param: the recipe page's current servings, so planning keeps them (audit F37). */
export function PlanRecipeSheet({ id, servings: requested }: { id: string; servings?: string | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const once = useOnce();
  const recipe = useRecipe(id);
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const days = planningDays();
  const [day, setDay] = useState(days.thisWeek[0]?.iso ?? days.nextWeek[0]?.iso ?? '');
  const defaultSlot: Slot =
    recipe && !recipe.mealTypes.includes('dinner') && recipe.mealTypes.includes('breakfast')
      ? 'breakfast'
      : recipe && !recipe.mealTypes.includes('dinner') && recipe.mealTypes.includes('lunch')
        ? 'lunch'
        : 'dinner';
  const [slot, setSlot] = useState<Slot>(defaultSlot);
  const [servings, setServings] = useState(parseServings(requested) ?? recipe?.servings ?? 4);

  if (!recipe) {
    return (
      <Sheet title="Plan" onClose={() => goBackOr(router)}>
        <Text variant="body">This recipe isn’t available any more.</Text>
      </Sheet>
    );
  }

  const chosen = [...days.thisWeek, ...days.nextWeek].find((d) => d.iso === day);
  const where = chosen
    ? chosen.long === 'tonight' && slot === 'dinner'
      ? 'tonight'
      : `${chosen.long === 'tonight' ? 'today' : chosen.long} ${slot}`
    : slot;
  // Once only: the sheet takes a moment to close, and a second tap would plan it twice.
  const add = once(() => {
    const entry = addEntry(recipe.id, day, slot, servings);
    toast({ message: `${recipe.title} planned for ${where}`, undo: () => removeEntry(entry.id) });
    goBackOr(router);
  });

  return (
    <Sheet title={`Plan ${recipe.title}`} onClose={() => goBackOr(router)}>
      {[
        { title: 'This week', key: 'this', list: days.thisWeek },
        { title: 'Next week', key: 'next', list: days.nextWeek },
      ].map((w) =>
        w.list.length ? (
          <View key={w.title} style={{ gap: SPACE.sm }}>
            <SectionHeader title={w.title} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
              {/* Ids by position, so a test can always pick "today" (this-0) or next week's first day (next-0). */}
              {w.list.map((d, i) => (
                <Chip
                  key={d.iso}
                  label={d.short}
                  selected={d.iso === day}
                  onPress={() => setDay(d.iso)}
                  testID={`plan-day-${w.key}-${i}`}
                />
              ))}
            </View>
          </View>
        ) : null,
      )}
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Meal" />
        <Segmented<Slot> label="Meal" options={SLOTS} value={slot} onChange={setSlot} />
      </View>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="For" />
        <Stepper
          label="Servings"
          value={servings}
          onChange={setServings}
          format={(n) => `${n} ${n === 1 ? 'person' : 'people'}`}
          testID="plan-servings"
        />
      </View>
      <Button label={`Add to ${where}`} kind="primary" block onPress={add} testID="plan-confirm" />
    </Sheet>
  );
}
