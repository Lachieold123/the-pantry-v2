// Recipes: the catalogue. Browse sections, search and filters arrive with
// Phase 3; for now it's the full list, each opening its recipe page.
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

export function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + SPACE.md,
        paddingHorizontal: SPACE.screen,
        paddingBottom: SPACE.xxl,
        gap: SPACE.md,
      }}
      data={CATALOGUE}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={<Masthead kicker={`${CATALOGUE.length} recipes`} title="Recipes" />}
      ListEmptyComponent={
        <EmptyState
          title="The kitchen is still testing"
          body="Recipes appear here once they've been cooked and checked in The Pantry kitchen."
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: SPACE.xs }} />}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item}
          image={RECIPE_IMAGES[item.id]}
          size="row"
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}
