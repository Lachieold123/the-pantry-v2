// The filters sheet (map Phase 3): results update as you choose, and the
// footer says exactly how many recipes you'll see.
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { DietPreference } from '@/domain/recipes/diets';
import { CUISINE_LABELS, MEAL_TYPE_LABELS } from '@/domain/recipes/labels';
import { fromISODate } from '@/domain/plan/week';
import { seasonOn, type TimeFilter } from '@/domain/recipes/search';
import { CUISINES, DIFFICULTIES, MEAL_TYPES } from '@/domain/recipes/types';
import { goBackOr } from '@/lib/navigation';
import { useToday } from '@/lib/useToday';
import { toggleIn, useRecipeFilters } from '@/store/recipeFilters';
import { ActionBar } from '@/ui/patterns/ActionBar';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Sheet } from '@/ui/primitives/Sheet';
import { Switch } from '@/ui/primitives/Switch';
import { SPACE } from '@/ui/tokens/type';
import { useRecipeResults } from './useRecipeResults';

const DIETS: readonly { value: DietPreference; label: string }[] = [
  { value: 'everything', label: 'Everything' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
];
const TIMES: { value: TimeFilter; label: string }[] = [
  { value: 'under-30', label: '30 min or less' },
  { value: 'under-45', label: '45 min or less' },
  { value: 'under-60', label: 'An hour or less' },
  { value: 'over-60', label: 'Longer cooks' },
];
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{children}</View>;
}

export function FiltersScreen() {
  const router = useRouter();
  const { filters, update, clear, setShowAll } = useRecipeFilters(
    useShallow(({ filters, update, clear, setShowAll }) => ({ filters, update, clear, setShowAll })),
  );
  const { results, activeFilters, browsing } = useRecipeResults();
  const season = seasonOn(fromISODate(useToday()));
  const count = browsing ? 'all recipes' : results.length === 1 ? '1 recipe' : `${results.length} recipes`;
  const matches = results.length === 1 ? '1 recipe matches' : `${results.length} recipes match`;
  // With nothing chosen the footer promises "all recipes", so it opens the full
  // list rather than dropping you back on the browse shelves.
  const show = () => {
    if (browsing) setShowAll(true);
    goBackOr(router);
  };

  return (
    <View style={{ flex: 1 }}>
      <Sheet kicker={browsing ? 'Filters' : matches} title="Refine your rotation" onClose={() => goBackOr(router)}>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Diet" />
          <ChipRow>
            {DIETS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={filters.diet === d.value}
                onPress={() => update({ diet: d.value })}
                testID={`filter-diet-${d.value}`}
              />
            ))}
          </ChipRow>
        </View>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Time" />
          <ChipRow>
            {TIMES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={filters.time === t.value}
                onPress={() => update(filters.time === t.value ? { time: undefined } : { time: t.value })}
                testID={`filter-time-${t.value}`}
              />
            ))}
          </ChipRow>
        </View>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Meal" />
          <ChipRow>
            {MEAL_TYPES.map((m) => (
              <Chip
                key={m}
                label={MEAL_TYPE_LABELS[m]}
                selected={filters.mealTypes.includes(m)}
                onPress={() => update({ mealTypes: toggleIn(filters.mealTypes, m) })}
                testID={`filter-meal-${m}`}
              />
            ))}
          </ChipRow>
        </View>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Difficulty" />
          <ChipRow>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={DIFFICULTY_LABELS[d]}
                selected={filters.difficulties.includes(d)}
                onPress={() => update({ difficulties: toggleIn(filters.difficulties, d) })}
                testID={`filter-difficulty-${d}`}
              />
            ))}
          </ChipRow>
        </View>
        <View>
          <Switch
            label="One pot or pan"
            detail="Fewer dishes to wash"
            value={filters.onePot}
            onChange={(onePot) => update({ onePot })}
            testID="filter-one-pot"
          />
          <Switch
            label="In season now"
            detail={`Recipes that suit ${season}`}
            value={filters.inSeason === season}
            onChange={(on) => update({ inSeason: on ? season : undefined })}
            testID="filter-in-season"
          />
        </View>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Cuisine" />
          <ChipRow>
            {CUISINES.map((c) => (
              <Chip
                key={c}
                label={CUISINE_LABELS[c]}
                selected={filters.cuisines.includes(c)}
                onPress={() => update({ cuisines: toggleIn(filters.cuisines, c) })}
                testID={`filter-cuisine-${c}`}
              />
            ))}
          </ChipRow>
        </View>
      </Sheet>
      <ActionBar>
        <Button label="Clear all" kind="quiet" onPress={clear} disabled={activeFilters === 0} testID="filters-clear" />
        <View style={{ flex: 1 }}>
          <Button label={`Show ${count}`} kind="primary" block onPress={show} testID="filters-show" />
        </View>
      </ActionBar>
    </View>
  );
}
