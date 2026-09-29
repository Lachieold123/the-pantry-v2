// One planned meal: the recipe, who it's for, and a way to take it off.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import type { PlanEntry } from '@/domain/plan/week';
import { usePlan } from '@/store/plan';
import { useRecipe } from '@/store/recipeBook';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const SLOT_NAMES = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' } as const;

export function PlanEntryRow({ entry, past }: { entry: PlanEntry; past: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const removeEntry = usePlan((s) => s.removeEntry);
  const restoreEntry = usePlan((s) => s.restoreEntry);
  const setServings = usePlan((s) => s.setServings);
  const recipe = useRecipe(entry.recipeId);

  if (!recipe) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Text variant="meta" style={{ flex: 1 }}>
          {SLOT_NAMES[entry.slot]}: a recipe that’s no longer available
        </Text>
        <IconButton icon="close" label="Remove from plan" onPress={() => removeEntry(entry.id)} />
      </View>
    );
  }

  const remove = () => {
    const removed = removeEntry(entry.id);
    if (removed) toast({ message: `${recipe.title} taken off the plan`, undo: () => restoreEntry(removed) });
  };

  return (
    <View style={{ gap: SPACE.xs, opacity: past ? 0.6 : 1 }}>
      <RecipeCard
        recipe={recipe}
        image={RECIPE_IMAGES[recipe.id]}
        size="row"
        note={past ? `${SLOT_NAMES[entry.slot]} · for ${entry.servings}` : SLOT_NAMES[entry.slot]}
        onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      />
      {past ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 72 + SPACE.md }}>
          <Stepper label="People" value={entry.servings} onChange={(n) => setServings(entry.id, n)} format={(n) => `For ${n}`} />
          <IconButton icon="close" label={`Take ${recipe.title} off the plan`} onPress={remove} colour="inkMuted" />
        </View>
      )}
    </View>
  );
}
