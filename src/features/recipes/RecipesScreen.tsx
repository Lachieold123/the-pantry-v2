// Recipes: browse shelves, or search and filter the whole catalogue (Phase 3).
import { useRouter } from 'expo-router';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { useRecipeFilters } from '@/store/recipeFilters';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { Button } from '@/ui/primitives/Button';
import { SearchField } from '@/ui/primitives/SearchField';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';
import { BrowseSections } from './BrowseSections';
import { useRecipeResults } from './useRecipeResults';

export function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const query = useRecipeFilters((s) => s.query);
  const setQuery = useRecipeFilters((s) => s.setQuery);
  const clear = useRecipeFilters((s) => s.clear);
  const { browsing, results, activeFilters } = useRecipeResults();
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const pad = { paddingTop: insets.top + SPACE.md, paddingHorizontal: SPACE.gutter, paddingBottom: SPACE.xxl, gap: SPACE.lg };

  const header = (
    <View style={{ gap: SPACE.md }}>
      <TitleBlock title="Recipes" action={<Button label="Surprise me" kind="quiet" onPress={() => router.push('/surprise')} />} />
      <View style={{ flexDirection: 'row', gap: SPACE.xs, alignItems: 'center' }}>
        <SearchField value={query} onChange={setQuery} placeholder="Search recipes" label="Search recipes" />
        <Button label={activeFilters ? `Filters · ${activeFilters}` : 'Filters'} icon="filter" onPress={() => router.push('/filters')} />
      </View>
      {!browsing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="meta" accessibilityLiveRegion="polite">
            {results.length === 1 ? '1 recipe' : `${results.length} recipes`}
          </Text>
          {activeFilters ? <Button label="Clear filters" kind="quiet" onPress={clear} /> : null}
        </View>
      ) : null}
    </View>
  );

  if (CATALOGUE.length === 0) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colours.bg }} contentContainerStyle={pad}>
        <TitleBlock title="Recipes" />
        <EmptyState
          title="The kitchen is still testing"
          body="Recipes appear here once they've been cooked and checked in The Pantry kitchen."
        />
      </ScrollView>
    );
  }

  if (browsing) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colours.bg }} contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
        {header}
        <BrowseSections />
      </ScrollView>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={{ ...pad, gap: SPACE.md }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      data={results}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          title="No recipes match"
          body={activeFilters ? 'Try loosening a filter or two.' : 'Check the spelling, or search for an ingredient instead.'}
          {...(activeFilters ? { action: { label: 'Clear filters', onPress: clear } } : {})}
        />
      }
      renderItem={({ item }) => <RecipeCard recipe={item} image={RECIPE_IMAGES[item.id]} size="row" onPress={() => open(item.id)} />}
    />
  );
}
