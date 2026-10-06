// The home tab, in v1's layout (FeedScreen.tsx, spec §7 Feed). At the top, the
// "What I have / Everything" switch with search beside it (D-034), then Time
// and Cuisine (the two questions a weeknight asks; Browse has the rest); then five big cards to swipe through and a
// two-column grid. In "What I have" the grid is followed by "Nearly there".
// Each card says why it's there (domain/suggestions/home.ts).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CUISINE_LABELS, TIME_FILTER_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES } from '@/domain/recipes/types';
import { needLine } from '@/domain/cupboard/cookable';
import { defaultHomeMode, hasHomeFilters, homeFeed, NO_HOME_FILTERS, type HomeFilters, type HomeMode } from '@/domain/suggestions/home';
import { toISODate, tonightsDinner } from '@/domain/plan/week';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { useAllRecipes, useRecipeLookup } from '@/store/recipeBook';
import { useBookmarks } from '@/store/saved';
import { useForYou } from '@/store/suggestions';
import { DropdownChips, type Dropdown } from '@/ui/patterns/DropdownChips';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { HOME } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { HeroCarousel } from './HeroCarousel';
import { PantrySwitch } from './PantrySwitch';
import { HomeEmpty } from './HomeEmpty';
import { PlatesRail } from './PlatesRail';

const TIMES = (Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((t) => ({ value: t, label: TIME_FILTER_LABELS[t] }));
const CUISINE_OPTIONS = CUISINES.map((c) => ({ value: c, label: CUISINE_LABELS[c] })).sort((a, b) => a.label.localeCompare(b.label));

export function FeedScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<HomeFilters>(NO_HOME_FILTERS);
  const entries = usePlan((s) => s.entries);
  const welcome = useWelcomeBack((s) => s.message);
  const dismissWelcome = useWelcomeBack((s) => s.dismiss);
  const all = useAllRecipes();
  // The whole ranked list, so a filter like "≤ 15 min" still has plenty to show.
  const forYou = useForYou(all.length);
  const cook = useCookableNow();
  const getRecipe = useRecipeLookup();
  const bookmarks = useBookmarks();
  const tonight = tonightsDinner(entries, toISODate(new Date()));
  // Starts on "What I have" whenever the cupboard can make something; a tap on the switch wins after that.
  // The welcome's "Show what I can cook" asks for it outright (?show=pantry): even a cupboard of lemon and
  // parsley should land on what's nearly there, not on everything.
  const { show } = useLocalSearchParams<{ show?: string }>();
  const [chosenMode, setMode] = useState<HomeMode | undefined>();
  const mode = chosenMode ?? (show === 'pantry' ? 'pantry' : defaultHomeMode(cook.ready.length));
  const needs = new Map(cook.nearly.map((m) => [m.recipe.id, needLine(m.result, ingredientName)]));
  const { heroes, grid, nearly, readyCount } = homeFeed({
    mode,
    tonight: tonight ? getRecipe(tonight.recipeId) : undefined,
    ready: cook.ready.map((m) => m.recipe),
    nearly: cook.nearly.map((m) => m.recipe),
    forYou,
    filters,
    gridCount: HOME.gridCount,
  });
  const pantry = mode === 'pantry';
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

  const dropdowns: Dropdown[] = [
    { key: 'time', name: 'Time', value: filters.time, options: TIMES },
    { key: 'cuisine', name: 'Cuisine', value: filters.cuisine, options: CUISINE_OPTIONS },
  ];
  const choose = (key: string, value: string | undefined) =>
    setFilters((f) => ({
      ...f,
      ...(key === 'time' ? { time: TIMES.find((o) => o.value === value)?.value } : {}),
      ...(key === 'cuisine' ? { cuisine: CUISINE_OPTIONS.find((o) => o.value === value)?.value } : {}),
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
          <PantrySwitch
            mode={mode}
            onMode={setMode}
            ready={readyCount}
            stocked={cook.have.size}
            onCupboard={() => router.navigate('/cupboard')}
            onSearch={() => router.push({ pathname: '/browse', params: { search: '1' } })}
          />
        </View>
        <View style={{ marginBottom: HOME.afterFilters }}>
          <DropdownChips dropdowns={dropdowns} onChoose={choose} testIDPrefix="home-filter" />
        </View>

        {heroes.length === 0 ? (
          <HomeEmpty
            pantry={pantry}
            stocked={cook.have.size}
            filtered={hasHomeFilters(filters)}
            onClear={() => setFilters(NO_HOME_FILTERS)}
            onCupboard={() => router.navigate('/cupboard')}
            onEverything={() => setMode('all')}
            onBrowse={() => router.push('/browse')}
          />
        ) : (
          <View style={{ marginBottom: HOME.afterCarousel, gap: SPACE.sm }}>
            {pantry && heroes[0]?.reason === 'nearly' ? (
              <Text variant="meta" testID="home-nearly-note">
                Nothing’s fully ready yet. These are one or two things short.
              </Text>
            ) : null}
            <HeroCarousel
              // A new set of cards starts again at the first one, with its dot.
              key={heroes.map((h) => h.recipe.id).join()}
              heroes={heroes}
              servingsFor={(h) => (h.reason === 'planned' && tonight ? tonight.servings : h.recipe.servings)}
              needFor={(id) => needs.get(id)}
              onOpen={open}
            />
          </View>
        )}

        {pantry ? null : <PlatesRail />}

        {grid.length ? (
          <View style={{ marginBottom: HOME.afterCarousel }}>
            <SectionHeader
              kicker={pantry ? `Ready now · ${readyCount}` : 'More for you'}
              tone="accent"
              title={pantry ? 'More you can cook' : "What's cooking?"}
            />
            <RecipeGrid
              recipes={grid}
              imageFor={(id) => RECIPE_IMAGES[id]}
              onOpen={open}
              isSaved={bookmarks.isSaved}
              onToggleSave={bookmarks.toggle}
            />
          </View>
        ) : null}

        {nearly.length ? (
          <View style={{ marginBottom: HOME.afterCarousel }} testID="home-nearly">
            <SectionHeader kicker="One or two things short" tone="accent" title="Nearly there" />
            <RecipeGrid
              recipes={nearly}
              imageFor={(id) => RECIPE_IMAGES[id]}
              onOpen={open}
              noteFor={(r) => needs.get(r.id)}
              isSaved={bookmarks.isSaved}
              onToggleSave={bookmarks.toggle}
            />
          </View>
        ) : null}

        {heroes.length ? (
          <Button label="Browse all recipes" kind="soft" block onPress={() => router.push('/browse')} testID="home-browse-all" />
        ) : null}
      </View>
    </Screen>
  );
}
