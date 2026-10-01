// The home tab, in v1's layout (FeedScreen.tsx, spec §7 Feed): a search bar
// that opens Browse (D-033), a row of filter chips, five big cards to swipe through, then "What's cooking?" as a
// two-column grid. Until posts arrive with social (P9) the cards are recipes,
// each labelled with why it's there (domain/suggestions/home.ts). Tonight's
// planned dinner leads, so Tuesday 6pm still opens on what you're cooking.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CUISINE_LABELS, DIFFICULTY_LABELS, MEAL_TYPE_LABELS, TIME_FILTER_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES, DIFFICULTIES } from '@/domain/recipes/types';
import { hasHomeFilters, homeFeed, NO_HOME_FILTERS, type HomeFilters } from '@/domain/suggestions/home';
import { toISODate, tonightsDinner } from '@/domain/plan/week';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { useCookableNow } from '@/store/cookable';
import { useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { useAllRecipes, useRecipeLookup } from '@/store/recipeBook';
import { useBookmarks } from '@/store/saved';
import { useForYou } from '@/store/suggestions';
import { DropdownChips, type Dropdown } from '@/ui/patterns/DropdownChips';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { SearchButton } from '@/ui/primitives/SearchField';
import { Text } from '@/ui/primitives/Text';
import { HOME } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { HeroCarousel } from './HeroCarousel';
import { PlatesRail } from './PlatesRail';

const MEALS = (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => ({ value: m, label: MEAL_TYPE_LABELS[m] }));
const TIMES = (Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((t) => ({ value: t, label: TIME_FILTER_LABELS[t] }));
const CUISINE_OPTIONS = CUISINES.map((c) => ({ value: c, label: CUISINE_LABELS[c] })).sort((a, b) => a.label.localeCompare(b.label));
const LEVELS = DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }));

export function FeedScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<HomeFilters>(NO_HOME_FILTERS);
  const entries = usePlan((s) => s.entries);
  const welcome = useWelcomeBack((s) => s.message);
  const dismissWelcome = useWelcomeBack((s) => s.dismiss);
  const all = useAllRecipes();
  // The whole ranked list, so a filter like "Breakfast" still has plenty to show.
  const forYou = useForYou(all.length);
  const cook = useCookableNow();
  const getRecipe = useRecipeLookup();
  const bookmarks = useBookmarks();
  const tonight = tonightsDinner(entries, toISODate(new Date()));
  const { heroes, grid } = homeFeed({
    tonight: tonight ? getRecipe(tonight.recipeId) : undefined,
    cookableNow: cook.ready.map((m) => m.recipe),
    forYou,
    filters,
    gridCount: HOME.gridCount,
  });
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

  const dropdowns: Dropdown[] = [
    { key: 'meal', name: 'Meal', value: filters.meal, options: MEALS },
    { key: 'time', name: 'Time', value: filters.time, options: TIMES },
    { key: 'cuisine', name: 'Cuisine', value: filters.cuisine, options: CUISINE_OPTIONS },
    { key: 'difficulty', name: 'Difficulty', value: filters.difficulty, options: LEVELS },
  ];
  const choose = (key: string, value: string | undefined) =>
    setFilters((f) => ({
      ...f,
      ...(key === 'meal' ? { meal: MEALS.find((o) => o.value === value)?.value } : {}),
      ...(key === 'time' ? { time: TIMES.find((o) => o.value === value)?.value } : {}),
      ...(key === 'cuisine' ? { cuisine: CUISINE_OPTIONS.find((o) => o.value === value)?.value } : {}),
      ...(key === 'difficulty' ? { difficulty: LEVELS.find((o) => o.value === value)?.value } : {}),
    }));

  return (
    <Screen tab testID="feed-screen">
      <View>
        {welcome ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs, marginBottom: SPACE.md }}
            accessibilityLiveRegion="polite"
          >
            <Text variant="body" colour="inkSoft" style={{ flex: 1 }}>
              {welcome}
            </Text>
            <IconButton icon="close" label="Dismiss" onPress={dismissWelcome} colour="inkMuted" testID="welcome-back-dismiss" />
          </View>
        ) : null}

        {/* The same top space TitleBlock gives the other tabs. */}
        <View style={{ marginTop: SPACE.xs, marginBottom: SPACE.sm }}>
          <SearchButton
            placeholder="Search recipes, ingredients…"
            onPress={() => router.push({ pathname: '/browse', params: { search: '1' } })}
            testID="home-search"
          />
        </View>
        <View style={{ marginBottom: HOME.afterFilters }}>
          <DropdownChips dropdowns={dropdowns} onChoose={choose} testIDPrefix="home-filter" />
        </View>

        {heroes.length === 0 ? (
          hasHomeFilters(filters) ? (
            <EmptyState
              title="Nothing here yet"
              body="No recipes match all of those. Try a different filter."
              action={{ label: 'Clear filters', onPress: () => setFilters(NO_HOME_FILTERS) }}
              testID="home-no-match"
            />
          ) : (
            <EmptyState
              title="Nothing to suggest yet"
              body="Your diet and avoid list rule out every recipe. Loosen them in Settings, or browse everything."
              action={{ label: 'Browse recipes', onPress: () => router.push('/browse') }}
              testID="feed-empty"
            />
          )
        ) : (
          <View style={{ marginBottom: HOME.afterCarousel }}>
            <HeroCarousel
              heroes={heroes}
              servingsFor={(h) => (h.reason === 'planned' && tonight ? tonight.servings : h.recipe.servings)}
              onOpen={open}
            />
          </View>
        )}

        <PlatesRail />

        {grid.length ? (
          <View>
            <SectionHeader kicker="More for you" tone="accent" title="What's cooking?" />
            <RecipeGrid
              recipes={grid}
              imageFor={(id) => RECIPE_IMAGES[id]}
              onOpen={open}
              isSaved={bookmarks.isSaved}
              onToggleSave={bookmarks.toggle}
            />
            <View style={{ marginTop: SPACE.lg }}>
              <Button label="Browse all recipes" kind="soft" block onPress={() => router.push('/browse')} testID="home-browse-all" />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
