// The Browse tab (spec §7 Browse): "Discover", search and filters, then either
// the browse shelves or a two-column grid of results. The grid is a virtualised
// list of rows, so the whole catalogue scrolls smoothly (audit PERF-17).
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { moods, presetShown, quickChips, togglePreset } from '@/domain/recipes/browse';
import { fromISODate } from '@/domain/plan/week';
import { seasonOn } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useToday } from '@/lib/useToday';
import { useAllRecipes } from '@/store/recipeBook';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useAnnounce } from '@/ui/a11y/announce';
import { useBookmarks } from '@/ui/patterns/useBookmarks';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeRow } from '@/ui/patterns/RecipeGrid';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { Badge } from '@/ui/primitives/Badge';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { IconButton } from '@/ui/primitives/IconButton';
import { SearchField } from '@/ui/primitives/SearchField';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CARD, hitSlopFor, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { BrowseSections } from './BrowseSections';
import { useRecipeResults } from './useRecipeResults';

const image = (id: string) => RECIPE_IMAGES[id];
const RowGap = () => <View style={{ height: SPACE.sm }} />;
// The "Quick meals ×" pill is drawn about 30pt tall (7pt padding around 16pt chip text).
const BROWSE_PILL_HEIGHT = 30;
const RESULTS_ANNOUNCE_MS = 800;

export function RecipesScreen() {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useStyles();
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  const showAll = useRecipeFilters((s) => s.showAll);
  const setQuery = useRecipeFilters((s) => s.setQuery);
  const clear = useRecipeFilters((s) => s.clear);
  const apply = useRecipeFilters((s) => s.apply);
  const presetLabel = useRecipeFilters((s) => s.presetLabel);
  const bookmarks = useBookmarks();
  const all = useAllRecipes();
  const { browsing, results, activeFilters } = useRecipeResults();
  // Stable, so the memoised cards don't all redraw on every keystroke.
  const open = useCallback((id: string) => router.push({ pathname: '/recipe/[id]', params: { id } }), [router]);
  const season = seasonOn(fromISODate(useToday()));
  // The named chip or shelf being shown, for the pill that says what you're looking at. Chips
  // first: "Vegetarian" and the "Plant forward" shelf set the same filter, and the plain name reads truer.
  const shown = presetShown([...quickChips(season), ...moods(season)], filters, query, presetLabel);
  const rows = useMemo(() => {
    const out: Recipe[][] = [];
    for (let i = 0; i < results.length; i += 2) out.push(results.slice(i, i + 2));
    return out;
  }, [results]);
  const { isSaved, toggle } = bookmarks;
  const count = results.length === 1 ? '1 recipe' : `${results.length} recipes`;
  // Spoken once typing pauses, so VoiceOver isn't reading a count per keystroke (audit F97).
  useAnnounce(browsing ? null : count, { delayMs: RESULTS_ANNOUNCE_MS });
  const renderRow = useCallback(
    ({ item }: { item: Recipe[] }) => (
      <View style={styles.inset}>
        <RecipeRow row={item} imageFor={image} onOpen={open} isSaved={isSaved} onToggleSave={toggle} />
      </View>
    ),
    [styles.inset, open, isSaved, toggle],
  );
  const reset = () => {
    clear();
    setQuery('');
  };

  const header = (
    <View style={styles.header}>
      <TitleBlock kicker="Browse" tone="accent" title="Discover" />
      <View style={styles.searchRow}>
        <SearchField value={query} onChange={setQuery} placeholder="Recipes, ingredients…" label="Search recipes" testID="browse-search" />
        <View>
          <IconButton
            icon="filter"
            shape={activeFilters ? 'fieldFilled' : 'field'}
            label={activeFilters ? `Filters, ${activeFilters} on` : 'Filters'}
            onPress={() => router.push('/filters')}
            testID="browse-filters"
          />
          <View style={styles.filterBadge} pointerEvents="none">
            <Badge count={activeFilters} />
          </View>
        </View>
      </View>
      {!browsing ? (
        <View style={styles.resultsBar}>
          {shown ? (
            <Pressable
              onPress={() => apply(togglePreset(shown, filters, query))}
              style={styles.pill}
              hitSlop={hitSlopFor(BROWSE_PILL_HEIGHT)}
              accessibilityRole="button"
              accessibilityLabel={`${shown.label}, clear`}
              testID="browse-pill"
            >
              <Text variant="chip" colour="bg" numberOfLines={1}>
                {shown.label}
              </Text>
              <Icon name="close" size={14} colour="bg" />
            </Pressable>
          ) : null}
          <Text variant="meta" style={{ flex: 1 }}>
            {count}
          </Text>
          {activeFilters || showAll || query ? <Button label="Clear" kind="quiet" onPress={reset} testID="browse-clear" /> : null}
        </View>
      ) : null}
    </View>
  );

  // Your own recipes count: a store build with no vetted recipes yet still shows them.
  if (all.length === 0) {
    return (
      <View style={[styles.page, { backgroundColor: colours.bg }]}>
        <View style={styles.header}>
          <TitleBlock kicker="Browse" tone="accent" title="Discover" />
          <EmptyState
            title="The kitchen is still testing"
            body="Recipes appear here once they’ve been cooked and checked in The Pantry kitchen."
          />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      data={browsing ? [] : rows}
      keyExtractor={(row) => row.map((r) => r.id).join()}
      ListHeaderComponent={
        <>
          {header}
          {browsing ? <BrowseSections /> : null}
        </>
      }
      ListEmptyComponent={
        browsing ? null : (
          <View style={styles.inset}>
            <EmptyState
              title="No recipes match"
              body={activeFilters ? 'Try loosening a filter or two.' : 'Check the spelling, or search for an ingredient instead.'}
              action={{ label: 'Clear search and filters', onPress: reset }}
              testID="browse-empty"
            />
          </View>
        )
      }
      renderItem={renderRow}
      ItemSeparatorComponent={RowGap}
    />
  );
}

const useStyles = makeStyles(({ colours }) => ({
  page: { flex: 1 },
  list: { paddingTop: SPACE.xs, paddingBottom: CARD.scrollBottom },
  // No gap under the title: TitleBlock already leaves v1's space below it (audit F111).
  header: { paddingHorizontal: SPACE.gutter, paddingBottom: SPACE.lg },
  inset: { paddingHorizontal: SPACE.gutter },
  searchRow: { flexDirection: 'row', gap: SPACE.xs + 2, alignItems: 'center' },
  filterBadge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.xxs },
  resultsBar: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: TAP_TARGET, marginTop: SPACE.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    maxWidth: '70%',
    paddingLeft: SPACE.sm,
    paddingRight: SPACE.xs + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
}));
