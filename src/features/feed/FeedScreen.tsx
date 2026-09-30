// The Feed tab, the app's home. Until posts arrive with social (P9) it carries
// v2's "Tonight" (the North Star's Tuesday 6pm moment), what's coming up, and
// recipes picked for you, all real (D-027). Posts join below in P9.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { addDays, entriesFor, fromISODate, toISODate, tonightsDinner } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useBookmarks } from '@/store/saved';
import { useForYou } from '@/store/suggestions';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const AHEAD_DAYS = 6;
const PICKS = 5;

export function FeedScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = usePlan((s) => s.entries);
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const welcome = useWelcomeBack((s) => s.message);
  const dismissWelcome = useWelcomeBack((s) => s.dismiss);
  const [suggestion, ...picks] = useForYou(PICKS);
  const today = toISODate(new Date());
  const tonight = tonightsDinner(entries, today);
  const getRecipe = useRecipeLookup();
  const bookmarks = useBookmarks();
  const tonightRecipe = tonight ? getRecipe(tonight.recipeId) : undefined;
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const ahead = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(today, i + 1)).flatMap((day) =>
    entriesFor(entries, day, 'dinner').map((entry) => ({ day, entry, recipe: getRecipe(entry.recipeId) })),
  );

  return (
    <Screen tab testID="feed-screen">
      {welcome ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs }} accessibilityLiveRegion="polite">
          <Text variant="body" colour="inkSoft" style={{ flex: 1 }}>
            {welcome}
          </Text>
          <IconButton icon="close" label="Dismiss" onPress={dismissWelcome} colour="inkMuted" testID="welcome-back-dismiss" />
        </View>
      ) : null}

      {tonight && tonightRecipe ? (
        <View style={{ gap: SPACE.md }}>
          <SectionHeader kicker={`Tonight · ${longDate(new Date())}`} tone="accent" title="On for dinner" />
          <RecipeCard
            recipe={tonightRecipe}
            image={RECIPE_IMAGES[tonightRecipe.id]}
            size="large"
            note={`Dinner for ${tonight.servings}`}
            onPress={() => open(tonightRecipe.id)}
            testID="feed-tonight"
          />
          <Button
            label="Start cooking"
            icon="flame"
            kind="primary"
            size="lg"
            block
            testID="feed-cook"
            onPress={() =>
              router.push({ pathname: '/recipe/[id]/cook', params: { id: tonightRecipe.id, servings: String(tonight.servings) } })
            }
          />
          <Button label="Not feeling it? Surprise me" kind="quiet" onPress={() => router.push('/surprise')} testID="feed-surprise" />
        </View>
      ) : suggestion ? (
        <View style={{ gap: SPACE.md }}>
          <SectionHeader kicker={`Tonight · ${longDate(new Date())}`} tone="accent" title="How about this?" />
          <RecipeCard
            recipe={suggestion}
            image={RECIPE_IMAGES[suggestion.id]}
            size="large"
            onPress={() => open(suggestion.id)}
            testID="feed-tonight"
          />
          <Button
            label="Have this tonight"
            icon="plan"
            kind="primary"
            size="lg"
            block
            testID="feed-have-tonight"
            onPress={() => {
              const entry = addEntry(suggestion.id, today, 'dinner', suggestion.servings);
              toast({ message: `${suggestion.title} is on for tonight`, undo: () => removeEntry(entry.id) });
            }}
          />
          <Button label="Surprise me instead" kind="quiet" onPress={() => router.push('/surprise')} testID="feed-surprise" />
        </View>
      ) : (
        <EmptyState
          title="Nothing planned for tonight"
          body="Plan a few dinners and tonight's shows up here, ready to cook. Or let us choose."
          action={{ label: 'Surprise me', onPress: () => router.push('/surprise') }}
          testID="feed-empty"
        />
      )}

      {ahead.length ? (
        <View>
          <SectionHeader kicker="Coming up" tone="accent" title="This week" />
          {ahead.map(({ day, entry, recipe }) =>
            recipe ? (
              <RecipeCard
                key={entry.id}
                recipe={recipe}
                image={RECIPE_IMAGES[recipe.id]}
                size="row"
                note={longDate(fromISODate(day))}
                onPress={() => open(recipe.id)}
                testID={`feed-ahead-${entry.id}`}
              />
            ) : null,
          )}
        </View>
      ) : null}

      {picks.length ? (
        <View>
          <SectionHeader kicker="For you" tone="accent" title="What's cooking?" />
          <RecipeGrid
            recipes={picks}
            imageFor={(id) => RECIPE_IMAGES[id]}
            onOpen={open}
            isSaved={bookmarks.isSaved}
            onToggleSave={bookmarks.toggle}
          />
        </View>
      ) : null}
    </Screen>
  );
}
