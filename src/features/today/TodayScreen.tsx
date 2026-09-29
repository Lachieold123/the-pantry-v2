// Today: tonight's dinner first, then the rest of the week (map §6).
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { getCatalogueRecipe } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { addDays, entriesFor, fromISODate, toISODate, tonightsDinner } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { SPACE } from '@/ui/tokens/type';

const AHEAD_DAYS = 6;

export function TodayScreen() {
  const router = useRouter();
  const entries = usePlan((s) => s.entries);
  const today = toISODate(new Date());
  const tonight = tonightsDinner(entries, today);
  const tonightRecipe = tonight ? getCatalogueRecipe(tonight.recipeId) : undefined;
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const ahead = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(today, i + 1)).flatMap((day) =>
    entriesFor(entries, day, 'dinner').map((entry) => ({ day, entry, recipe: getCatalogueRecipe(entry.recipeId) })),
  );

  return (
    <Screen>
      <Masthead
        kicker={longDate(new Date())}
        title="Tonight"
        action={<IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />}
      />
      {tonight && tonightRecipe ? (
        <View style={{ gap: SPACE.md }}>
          <RecipeCard
            recipe={tonightRecipe}
            image={RECIPE_IMAGES[tonightRecipe.id]}
            size="large"
            note={`Dinner for ${tonight.servings}`}
            onPress={() => open(tonightRecipe.id)}
          />
          <Button
            label="Cook"
            icon="timer"
            kind="primary"
            block
            onPress={() =>
              router.push({ pathname: '/recipe/[id]/cook', params: { id: tonightRecipe.id, servings: String(tonight.servings) } })
            }
          />
        </View>
      ) : (
        <EmptyState
          title="Nothing planned for tonight"
          body="Plan a few dinners and tonight’s shows up here, ready to cook. Or let us choose."
          action={{ label: 'Surprise me', onPress: () => router.push('/surprise') }}
        />
      )}
      {tonight && tonightRecipe ? (
        <Button label="Not feeling it? Surprise me" kind="quiet" onPress={() => router.push('/surprise')} />
      ) : (
        <Button label="Browse recipes" kind="quiet" onPress={() => router.navigate('/recipes')} />
      )}
      {ahead.length ? (
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Coming up" />
          {ahead.map(({ day, entry, recipe }) =>
            recipe ? (
              <RecipeCard
                key={entry.id}
                recipe={recipe}
                image={RECIPE_IMAGES[recipe.id]}
                size="row"
                note={longDate(fromISODate(day))}
                onPress={() => open(recipe.id)}
              />
            ) : null,
          )}
        </View>
      ) : null}
    </Screen>
  );
}
