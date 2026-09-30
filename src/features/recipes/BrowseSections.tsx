// What Browse shows before you search (spec §7 Browse): the recipe of the day,
// quick chips, "cook by mood" shelves, what your cupboard can make, and a few
// fresh picks with a way into the whole catalogue. Finite by design (map §2).
// v1's "trending" row and People tab need real activity, so they arrive with
// social (P9) rather than as made-up numbers.
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { dailyPicks, moods, presetActive, quickChips, recipeOfTheDay, recipesFor, togglePreset } from '@/domain/recipes/browse';
import { needLine } from '@/domain/cupboard/cookable';
import { toISODate } from '@/domain/plan/week';
import { seasonOn } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { useAllRecipes } from '@/store/recipeBook';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useBookmarks, useSaved } from '@/store/saved';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { ShelfCard } from '@/ui/patterns/ShelfCard';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { SPACE } from '@/ui/tokens/type';

const PICKS = 4;
const image = (id: string) => RECIPE_IMAGES[id];

export function BrowseSections() {
  const router = useRouter();
  const all = useAllRecipes();
  const hidden = useSaved((s) => s.hidden);
  const cook = useCookableNow();
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  const apply = useRecipeFilters((s) => s.apply);
  const setShowAll = useRecipeFilters((s) => s.setShowAll);
  const bookmarks = useBookmarks();
  const today = toISODate(new Date());
  const season = seasonOn(new Date());
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

  const data = useMemo(() => {
    // "Not for us" dishes never appear here.
    const visible = all.filter((r) => !hidden.includes(r.id));
    const featured = recipeOfTheDay(visible, today, (r) => image(r.id) !== undefined);
    const shelves = moods(season)
      .map((mood) => ({ mood, recipes: recipesFor(mood, visible) }))
      .filter((s) => s.recipes.length > 0);
    const picks = dailyPicks(
      visible.filter((r) => r.id !== featured?.id),
      today,
      PICKS,
    );
    return { visible, featured, shelves, picks };
  }, [all, hidden, today, season]);
  // One engine for every cupboard surface: diet, avoid list and "not for us" always apply.
  const canMake = [...cook.ready, ...cook.nearly].slice(0, PICKS);

  const featured = data.featured;

  return (
    <View style={{ gap: SPACE.xl }}>
      {featured ? (
        <View style={{ paddingHorizontal: SPACE.gutter }}>
          <SectionHeader kicker="Today" tone="accent" title="Recipe of the day" />
          <RecipeCard
            recipe={featured}
            image={image(featured.id)}
            size="large"
            onPress={() => open(featured.id)}
            testID="browse-featured"
          />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACE.xs, paddingHorizontal: SPACE.gutter }}
      >
        {quickChips(season).map((chip) => (
          <Chip
            key={chip.id}
            kind="quick"
            label={chip.label}
            selected={presetActive(chip, filters, query)}
            onPress={() => apply(togglePreset(chip, filters, query))}
            testID={`chip-${chip.id}`}
          />
        ))}
      </ScrollView>

      {data.shelves.length ? (
        <View>
          <SectionHeader kicker="Collections" tone="accent" title="Cook by mood" inset />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter }}
          >
            {data.shelves.map(({ mood, recipes }) => {
              const cover = recipes.find((r) => image(r.id) !== undefined) ?? recipes[0];
              return (
                <ShelfCard
                  key={mood.id}
                  title={mood.label}
                  count={recipes.length}
                  image={cover ? image(cover.id) : undefined}
                  cuisine={cover?.cuisine ?? ''}
                  onPress={() => apply(togglePreset(mood, filters, query))}
                  testID={`mood-${mood.id}`}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {canMake.length ? (
        <View style={{ paddingHorizontal: SPACE.gutter }}>
          <SectionHeader
            kicker="Your cupboard"
            tone="accent"
            title="Cook with what you have"
            action={<Button label="See all" kind="quiet" onPress={() => router.push('/cupboard/cookable')} testID="browse-cupboard-all" />}
          />
          <RecipeGrid
            recipes={canMake.map((m) => m.recipe)}
            imageFor={image}
            onOpen={open}
            isSaved={bookmarks.isSaved}
            onToggleSave={bookmarks.toggle}
            noteFor={(r: Recipe) => {
              const m = canMake.find((x) => x.recipe.id === r.id);
              return m ? needLine(m.result, ingredientName) : undefined;
            }}
          />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: SPACE.gutter, gap: SPACE.md }}>
        <SectionHeader kicker="All recipes" tone="accent" title="Something new" />
        <RecipeGrid recipes={data.picks} imageFor={image} onOpen={open} isSaved={bookmarks.isSaved} onToggleSave={bookmarks.toggle} />
        <Button
          label={`See all ${data.visible.length} recipes`}
          kind="secondary"
          block
          onPress={() => setShowAll(true)}
          testID="browse-see-all"
        />
      </View>
    </View>
  );
}
