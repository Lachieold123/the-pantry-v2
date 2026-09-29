// Today: tonight's dinner first (or a suggestion), then the rest of the week (map §6).
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { addDays, entriesFor, fromISODate, toISODate, tonightsDinner } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useForYou } from '@/store/suggestions';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const AHEAD_DAYS = 6;

export function TodayScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = usePlan((s) => s.entries);
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const welcome = useWelcomeBack((s) => s.message);
  const dismissWelcome = useWelcomeBack((s) => s.dismiss);
  const [suggestion] = useForYou(1);
  const today = toISODate(new Date());
  const tonight = tonightsDinner(entries, today);
  const getRecipe = useRecipeLookup();
  const tonightRecipe = tonight ? getRecipe(tonight.recipeId) : undefined;
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const ahead = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(today, i + 1)).flatMap((day) =>
    entriesFor(entries, day, 'dinner').map((entry) => ({ day, entry, recipe: getRecipe(entry.recipeId) })),
  );

  return (
    <Screen>
      <Masthead
        kicker={longDate(new Date())}
        title="Tonight"
        action={<IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />}
      />
      {welcome ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs }} accessibilityLiveRegion="polite">
          <Text variant="body" colour="inkSecondary" style={{ flex: 1 }}>
            {welcome}
          </Text>
          <IconButton icon="close" label="Dismiss" onPress={dismissWelcome} colour="inkMuted" />
        </View>
      ) : null}
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
      ) : suggestion ? (
        <View style={{ gap: SPACE.md }}>
          <Text variant="meta">Nothing planned yet. How about this?</Text>
          <RecipeCard recipe={suggestion} image={RECIPE_IMAGES[suggestion.id]} size="large" onPress={() => open(suggestion.id)} />
          <Button
            label="Have this tonight"
            icon="plan"
            kind="primary"
            block
            onPress={() => {
              const entry = addEntry(suggestion.id, today, 'dinner', suggestion.servings);
              toast({ message: `${suggestion.title} is on for tonight`, undo: () => removeEntry(entry.id) });
            }}
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
      ) : suggestion ? (
        <Button label="Surprise me instead" kind="quiet" onPress={() => router.push('/surprise')} />
      ) : null}
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
