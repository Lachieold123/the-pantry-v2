// What the Recipes tab shows before you search: a few finite, editorial
// shelves (no infinite scroll, no "For You" feed; map §2).
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { seasonOn } from '@/domain/recipes/search';
import { totalMinutes, type CuisineId, type Recipe } from '@/domain/recipes/types';
import { useRecipeFilters } from '@/store/recipeFilters';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { SPACE } from '@/ui/tokens/type';

const SHELF_SIZE = 8;
const SEASON_NAMES = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' } as const;

function Shelf({ title, recipes, onSeeAll }: { title: string; recipes: Recipe[]; onSeeAll: () => void }) {
  const router = useRouter();
  if (recipes.length === 0) return null;
  return (
    <View style={{ gap: SPACE.sm }}>
      <SectionHeader title={title} action={<Button label="See all" kind="quiet" onPress={onSeeAll} />} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACE.md, paddingRight: SPACE.screen }}
        style={{ marginRight: -SPACE.screen }}
      >
        {recipes.slice(0, SHELF_SIZE).map((r) => (
          <View key={r.id} style={{ width: 156 }}>
            <RecipeCard
              recipe={r}
              image={RECIPE_IMAGES[r.id]}
              size="medium"
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function BrowseSections() {
  const update = useRecipeFilters((s) => s.update);
  const season = seasonOn(new Date());
  const shelves = useMemo(() => {
    const inSeason = CATALOGUE.filter((r) => r.seasons?.includes(season));
    const quick = CATALOGUE.filter((r) => r.mealTypes.includes('dinner') && totalMinutes(r) <= 30);
    const counts = new Map<CuisineId, number>();
    for (const r of CATALOGUE) counts.set(r.cuisine, (counts.get(r.cuisine) ?? 0) + 1);
    const topCuisines = [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([c]) => c);
    return { inSeason, quick, topCuisines };
  }, [season]);

  return (
    <View style={{ gap: SPACE.xl }}>
      <Shelf title={`In season this ${SEASON_NAMES[season]}`} recipes={shelves.inSeason} onSeeAll={() => update({ inSeason: season })} />
      <Shelf title="Quick weeknights" recipes={shelves.quick} onSeeAll={() => update({ time: 'under-30', mealTypes: ['dinner'] })} />
      {shelves.topCuisines.map((c) => (
        <Shelf
          key={c}
          title={CUISINE_LABELS[c]}
          recipes={CATALOGUE.filter((r) => r.cuisine === c)}
          onSeeAll={() => update({ cuisines: [c] })}
        />
      ))}
    </View>
  );
}
