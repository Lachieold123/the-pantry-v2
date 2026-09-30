// The Browse tab (spec §7 Browse): "Discover", search and filters, then either
// the browse shelves or a two-column grid of results. The grid is a virtualised
// list of rows, so the whole catalogue scrolls smoothly (audit PERF-17).
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { moods, presetActive, quickChips } from '@/domain/recipes/browse';
import { seasonOn } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useBookmarks } from '@/store/saved';
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
import { CARD, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { BrowseSections } from './BrowseSections';
import { useRecipeResults } from './useRecipeResults';

const image = (id: string) => RECIPE_IMAGES[id];
const RowGap = () => <View style={{ height: SPACE.sm }} />;

export function RecipesScreen() {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useStyles();
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  const showAll = useRecipeFilters((s) => s.showAll);
  const setQuery = useRecipeFilters((s) => s.setQuery);
  const clear = useRecipeFilters((s) => s.clear);
  const bookmarks = useBookmarks();
  const { browsing, results, activeFilters } = useRecipeResults();
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const season = seasonOn(new Date());
  // The named shelf or chip being shown, for the pill that says what you're looking at.
  const shown = [...moods(season), ...quickChips(season)].find((p) => presetActive(p, filters, query));
  const rows = useMemo(() => {
    const out: Recipe[][] = [];
    for (let i = 0; i < results.length; i += 2) out.push(results.slice(i, i + 2));
    return out;
  }, [results]);
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
            shape={activeFilters ? 'filled' : 'square'}
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
              onPress={reset}
              style={styles.pill}
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
          <Text variant="meta" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
            {results.length === 1 ? '1 recipe' : `${results.length} recipes`}
          </Text>
          {activeFilters || showAll || query ? <Button label="Clear" kind="quiet" onPress={reset} testID="browse-clear" /> : null}
        </View>
      ) : null}
    </View>
  );

  if (CATALOGUE.length === 0) {
    return (
      <View style={[styles.page, { backgroundColor: colours.bg }]}>
        <View style={styles.header}>
          <TitleBlock kicker="Browse" tone="accent" title="Discover" />
          <EmptyState
            title="The kitchen is still testing"
            body="Recipes appear here once they've been cooked and checked in The Pantry kitchen."
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
            />
          </View>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.inset}>
          <RecipeRow row={item} imageFor={image} onOpen={open} isSaved={bookmarks.isSaved} onToggleSave={bookmarks.toggle} />
        </View>
      )}
      ItemSeparatorComponent={RowGap}
    />
  );
}

const useStyles = makeStyles(({ colours }) => ({
  page: { flex: 1 },
  list: { paddingTop: SPACE.xs, paddingBottom: CARD.scrollBottom },
  header: { paddingHorizontal: SPACE.gutter, gap: SPACE.md, paddingBottom: SPACE.lg },
  inset: { paddingHorizontal: SPACE.gutter },
  searchRow: { flexDirection: 'row', gap: SPACE.xs + 2, alignItems: 'center' },
  filterBadge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.xxs },
  resultsBar: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: TAP_TARGET },
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
