// Filters, in v1's layout (FiltersModal.tsx, spec §7 Filters): a grey page,
// the live count up top, and chips that turn a soft pastel when on. Results
// update as you choose; the button says exactly how many recipes you'll see.
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { DietPreference } from '@/domain/recipes/diets';
import { CUISINE_LABELS, MEAL_TYPE_LABELS } from '@/domain/recipes/labels';
import { seasonOn, type TimeFilter } from '@/domain/recipes/search';
import { CUISINES, DIFFICULTIES, MEAL_TYPES } from '@/domain/recipes/types';
import { goBack } from '@/lib/navigation';
import { useAllRecipes } from '@/store/recipeBook';
import { toggleIn, useRecipeFilters } from '@/store/recipeFilters';
import { useSaved } from '@/store/saved';
import { ActionBar } from '@/ui/patterns/ActionBar';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { cuisineTint } from '@/ui/tokens/cuisine';
import { FILTERS, FILTER_TINTS } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { useRecipeResults } from './useRecipeResults';

const DIETS: readonly { value: DietPreference; label: string }[] = [
  { value: 'everything', label: 'Everything' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
];
const TIMES: readonly { value: TimeFilter; label: string }[] = [
  { value: 'under-30', label: '30 min or less' },
  { value: 'under-45', label: '45 min or less' },
  { value: 'under-60', label: 'An hour or less' },
  { value: 'over-60', label: 'Longer cooks' },
];
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

type ChipProps = { label: string; selected: boolean; tint: keyof ColourTokens; onPress: () => void; testID: string; radio?: boolean };

/** v1's filter chip with its pastel "on" fill. The shared Chip only fills with ink, so the tinted version lives here. */
function TintChip({ label, selected, tint, onPress, testID, radio = false }: ChipProps) {
  const styles = useStyles();
  const { colours } = useTheme();
  const on = { backgroundColor: colours[tint], borderColor: colours[tint] };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.chip, selected && on, pressed && styles.pressed]}
    >
      <Text variant="chip">{label}</Text>
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View>
      <Text variant="headingSansSmall" accessibilityRole="header" style={styles.section}>
        {title}
      </Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

export function FiltersScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { filters, update, clear, setShowAll } = useRecipeFilters(
    useShallow(({ filters, update, clear, setShowAll }) => ({ filters, update, clear, setShowAll })),
  );
  const { results, activeFilters, browsing } = useRecipeResults();
  const all = useAllRecipes();
  const hidden = useSaved((s) => s.hidden);
  const season = seasonOn(new Date());
  // With nothing chosen Browse shows its shelves, so the count is everything the cook hasn't hidden.
  const count = browsing ? all.filter((r) => !hidden.includes(r.id)).length : results.length;
  const show = () => {
    // "Show 170 recipes" should show them, not the shelves.
    if (browsing) setShowAll(true);
    goBack(router);
  };

  return (
    <View style={styles.page} testID="filters-screen">
      <View style={styles.head}>
        <IconButton icon="back" label="Back" shape="squareOnSoft" size={24} onPress={() => goBack(router)} testID="filters-back" />
        <Text variant="titleSansLarge" accessibilityRole="header" style={styles.title}>
          {'Refine your\nrotation'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="lead" colour="inkMuted" accessibilityLiveRegion="polite" style={styles.count} testID="filters-count">
          {count === 1 ? '1 meal matches' : `${count} meals match`}
        </Text>
        <Group title="Cuisine">
          {CUISINES.map((c) => (
            <TintChip
              key={c}
              label={CUISINE_LABELS[c]}
              tint={cuisineTint(c)}
              selected={filters.cuisines.includes(c)}
              onPress={() => update({ cuisines: toggleIn(filters.cuisines, c) })}
              testID={`filter-cuisine-${c}`}
            />
          ))}
        </Group>
        <Group title="Diet">
          {DIETS.map((d) => (
            <TintChip
              key={d.value}
              label={d.label}
              radio
              tint={FILTER_TINTS.diet[d.value]}
              selected={filters.diet === d.value}
              onPress={() => update({ diet: d.value })}
              testID={`filter-diet-${d.value}`}
            />
          ))}
        </Group>
        <Group title="Meal type">
          {MEAL_TYPES.map((m) => (
            <TintChip
              key={m}
              label={MEAL_TYPE_LABELS[m]}
              tint={FILTER_TINTS.meal[m]}
              selected={filters.mealTypes.includes(m)}
              onPress={() => update({ mealTypes: toggleIn(filters.mealTypes, m) })}
              testID={`filter-meal-${m}`}
            />
          ))}
        </Group>
        <Group title="Time">
          {TIMES.map((t) => (
            <TintChip
              key={t.value}
              label={t.label}
              radio
              tint={FILTER_TINTS.time[t.value]}
              selected={filters.time === t.value}
              onPress={() => update(filters.time === t.value ? { time: undefined } : { time: t.value })}
              testID={`filter-time-${t.value}`}
            />
          ))}
        </Group>
        <Group title="Difficulty">
          {DIFFICULTIES.map((d) => (
            <TintChip
              key={d}
              label={DIFFICULTY_LABELS[d]}
              tint={FILTER_TINTS.difficulty[d]}
              selected={filters.difficulties.includes(d)}
              onPress={() => update({ difficulties: toggleIn(filters.difficulties, d) })}
              testID={`filter-difficulty-${d}`}
            />
          ))}
        </Group>
        <Group title="Cookware">
          <TintChip
            label="One pot or pan"
            tint={FILTER_TINTS.onePot}
            selected={filters.onePot}
            onPress={() => update({ onePot: !filters.onePot })}
            testID="filter-one-pot"
          />
        </Group>
        <Group title="Season">
          <TintChip
            label={`In season this ${season}`}
            tint={FILTER_TINTS.season}
            selected={filters.inSeason === season}
            onPress={() => update({ inSeason: filters.inSeason === season ? undefined : season })}
            testID="filter-in-season"
          />
        </Group>
        <Pressable
          onPress={clear}
          disabled={activeFilters === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: activeFilters === 0 }}
          testID="filters-clear"
          style={({ pressed }) => [styles.clear, activeFilters === 0 && styles.disabled, pressed && styles.pressed]}
        >
          <Text variant="pillLabel">Clear all filters</Text>
        </Pressable>
      </ScrollView>
      <ActionBar>
        <View style={{ flex: 1 }}>
          <Button
            label={count === 1 ? 'Show 1 recipe' : `Show ${count} recipes`}
            kind="primary"
            block
            onPress={show}
            testID="filters-show"
          />
        </View>
      </ActionBar>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  page: { flex: 1, backgroundColor: colours.bgSoft },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.gutter,
    paddingTop: FILTERS.headTop,
    paddingBottom: FILTERS.headBottom,
  },
  title: { flex: 1, marginTop: SPACE.xxs },
  body: { paddingHorizontal: FILTERS.bodyX, paddingTop: FILTERS.bodyTop, paddingBottom: FILTERS.bodyX },
  count: { marginBottom: FILTERS.countBottom },
  section: { marginBottom: FILTERS.sectionBottom },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: FILTERS.chipGap, marginBottom: FILTERS.groupBottom },
  // Off chips fill with the page colour, as v1's did, so they sit on the grey page in both modes.
  chip: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingVertical: FILTERS.chipPadY,
    paddingHorizontal: FILTERS.chipPadX,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bg,
  },
  clear: {
    marginTop: FILTERS.clearTop,
    paddingVertical: FILTERS.clearPadY,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    backgroundColor: colours.bg,
  },
  disabled: { opacity: FILTERS.disabled },
  pressed: { opacity: PRESSED.row },
}));
