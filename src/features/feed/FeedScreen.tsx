// The Feed tab, the app's home. It carries v2's "Tonight" (the North Star's
// Tuesday 6pm moment), what's coming up, and recipes picked for you, all real
// (D-027): there are no posts to show until cooks have accounts, and a feed of
// invented posts would be fake.
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { cookedOn } from '@/domain/cook/cook';
import { needLine } from '@/domain/cupboard/cookable';
import { addDays, entriesFor, fromISODate, toISODate, tonightsDinner } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { useToday } from '@/lib/useToday';
import { useCookLog } from '@/store/cookLog';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useBookmarks } from '@/ui/patterns/useBookmarks';
import { useForYou } from '@/store/suggestions';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { MatchCard } from '@/ui/patterns/MatchCard';
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
  const [forYouPick, ...picks] = useForYou(PICKS);
  const today = useToday();
  const getRecipe = useRecipeLookup();
  const log = useCookLog((s) => s.log);
  // A plan entry whose recipe is gone (a deleted own recipe) is not a meal: it mustn't hide tonight's real dinner (F17).
  const planned = useMemo(() => entries.filter((e) => getRecipe(e.recipeId) !== undefined), [entries, getRecipe]);
  const cookedToday = useMemo(() => cookedOn(log, today), [log, today]);
  const tonight = tonightsDinner(planned, today, cookedToday);
  const cookedTonight = tonight !== undefined && cookedToday.has(tonight.recipeId);
  const cook = useCookableNow();
  // Nothing planned? Something you can cook right now beats a suggestion you'd have to shop for.
  const suggestion = cook.ready[0]?.recipe ?? forYouPick;
  const fromCupboard = [...cook.ready, ...cook.nearly].slice(0, 6);
  const bookmarks = useBookmarks();
  const tonightRecipe = tonight ? getRecipe(tonight.recipeId) : undefined;
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const ahead = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(today, i + 1)).flatMap((day) =>
    entriesFor(planned, day, 'dinner').map((entry) => ({ day, entry, recipe: getRecipe(entry.recipeId) })),
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
          <SectionHeader
            kicker={`Tonight · ${longDate(fromISODate(today))}`}
            tone="accent"
            title={cookedTonight ? 'Cooked tonight' : 'On for dinner'}
          />
          <RecipeCard
            recipe={tonightRecipe}
            image={RECIPE_IMAGES[tonightRecipe.id]}
            size="large"
            note={cookedTonight ? 'Cooked. Enjoy!' : `Dinner for ${tonight.servings}`}
            // Opens scaled to tonight's planned servings, as Start cooking does (audit F37).
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: tonightRecipe.id, servings: String(tonight.servings) } })}
            testID="feed-tonight"
          />
          {/* Once it's cooked, "Start cooking" and "Not feeling it?" no longer fit the moment (F22). */}
          {cookedTonight ? null : (
            <>
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
            </>
          )}
        </View>
      ) : suggestion ? (
        <View style={{ gap: SPACE.md }}>
          <SectionHeader
            kicker={`Tonight · ${longDate(fromISODate(today))}`}
            tone="accent"
            title={cook.ready[0] ? 'You can cook this now' : 'How about this?'}
          />
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
              // The day at the moment of the tap, not the last render: the screen may have sat open past midnight (F16).
              const entry = addEntry(suggestion.id, toISODate(new Date()), 'dinner', suggestion.servings);
              toast({ message: `${suggestion.title} is on for tonight`, undo: () => removeEntry(entry.id) });
            }}
          />
        </View>
      ) : (
        <EmptyState
          title="Nothing planned for tonight"
          body="Plan a few dinners and tonight’s shows up here, ready to cook. Or let us choose."
          action={{ label: 'Surprise me', onPress: () => router.push('/surprise') }}
          testID="feed-empty"
        />
      )}

      {ahead.length ? (
        <View>
          {/* A rolling six days after tonight, not the calendar week (F143). */}
          <SectionHeader kicker="Coming up" tone="accent" title="Next few days" />
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

      {fromCupboard.length ? (
        <View>
          <SectionHeader
            kicker="From your cupboard"
            tone="accent"
            title="Cook with what you have"
            action={<Button label="See all" kind="quiet" onPress={() => router.push('/cupboard/cookable')} testID="feed-cupboard-all" />}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -SPACE.gutter }}
            contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter }}
          >
            {fromCupboard.map((m) => (
              <MatchCard
                key={m.recipe.id}
                recipe={m.recipe}
                image={RECIPE_IMAGES[m.recipe.id]}
                ready={m.tier === 'ready'}
                need={needLine(m.result, ingredientName)}
                onPress={() => open(m.recipe.id)}
                testID={`feed-match-${m.recipe.id}`}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <Button
          label="What can I cook from my cupboard?"
          icon="cupboard"
          kind="soft"
          block
          onPress={() => router.navigate('/cupboard')}
          testID="feed-to-cupboard"
        />
      )}

      {picks.length ? (
        <View>
          <SectionHeader kicker="For you" tone="accent" title="What’s cooking?" />
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
