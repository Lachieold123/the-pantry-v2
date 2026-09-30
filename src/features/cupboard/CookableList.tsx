// Everything you can cook from the cupboard, in two honest tiers: Ready, and
// Need 1–2 (with what to buy). A virtualised list, however many there are.
import { useRouter } from 'expo-router';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { needLine } from '@/domain/cupboard/cookable';
import { goBackOr } from '@/lib/navigation';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

export function CookableList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const { ready, nearly } = useCookableNow();
  const sections = [
    { key: 'ready', title: 'Ready to cook', data: ready },
    { key: 'nearly', title: 'Need 1–2 things', data: nearly },
  ].filter((s) => s.data.length > 0);
  return (
    <SectionList
      testID="cookable-list"
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + SPACE.md,
        paddingHorizontal: SPACE.gutter,
        paddingBottom: insets.bottom + SPACE.xxl,
      }}
      sections={sections}
      keyExtractor={(m) => m.recipe.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={<PushedHeader kicker="From your cupboard" title="What you can cook" />}
      ListEmptyComponent={
        <EmptyState
          title="Nothing close yet"
          body="Add a few more things to your cupboard and recipes will show up here."
          action={{ label: 'Back to the cupboard', onPress: () => goBackOr(router) }}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={{ paddingTop: SPACE.lg }}>
          <SectionHeader kicker={`${section.data.length}`} title={section.title} />
        </View>
      )}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item.recipe}
          image={RECIPE_IMAGES[item.recipe.id]}
          size="row"
          note={needLine(item.result, ingredientName)}
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.recipe.id } })}
        />
      )}
    />
  );
}
