// The pieces of the Plan tab around the day itself (spec §4.11–4.13): how
// full the week is, ideas for the day's next open meal, and the black
// shopping-list card that opens the list.
import { Pressable, ScrollView, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { needLine } from '@/domain/cupboard/cookable';
import { formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import type { ISODate, Slot } from '@/domain/plan/week';
import { capitalise, type ShoppingList } from '@/domain/shopping/derive';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { usePlan } from '@/store/plan';
import { useForYou } from '@/store/suggestions';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PLAN, RADIUS, SPACE } from '@/ui/tokens/type';

const RAIL = 8;
const PREVIEW = 5;

export function WeekProgress({ planned, total }: { planned: number; total: number }) {
  const styles = useStyles();
  return (
    <View
      style={styles.progressRow}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${planned} of ${total} meals planned this week`}
      accessibilityValue={{ min: 0, max: total, now: planned }}
      testID="plan-progress"
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round((planned / total) * 100)}%` }]} />
      </View>
      <Text variant="meta" colour="inkSoft">{`${planned} of ${total} meals`}</Text>
    </View>
  );
}

type SuggestProps = { day: ISODate; slot: Slot };

/** Ideas for the day's next open meal: what the cupboard can make first, then picks for this cook. */
export function DaySuggestions({ day, slot }: SuggestProps) {
  const toast = useToast();
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const { ready, nearly } = useCookableNow();
  const forYou = useForYou(RAIL * 3);
  const fromCupboard = [...ready, ...nearly].filter((m) => m.recipe.mealTypes.includes(slot)).slice(0, RAIL);
  const fromPantry = fromCupboard.length > 0;
  const ideas: { recipe: Recipe; note: string }[] = fromPantry
    ? fromCupboard.map((m) => ({ recipe: m.recipe, note: needLine(m.result, ingredientName) }))
    : forYou
        .filter((r) => r.mealTypes.includes(slot))
        .slice(0, RAIL)
        .map((r) => ({ recipe: r, note: formatMinutes(totalMinutes(r)) }));
  if (ideas.length === 0) return null;

  const plan = (recipe: Recipe) => {
    const entry = addEntry(recipe.id, day, slot, recipe.servings);
    toast({ message: `${recipe.title} added for ${slot}`, undo: () => removeEntry(entry.id) });
  };
  const title = fromPantry ? 'From your cupboard' : `Ideas for ${slot}`;
  return (
    <View>
      <SectionHeader kicker="Suggested for this day" title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACE.gutter }}
        contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter }}
      >
        {ideas.map(({ recipe, note }) => (
          <View key={recipe.id} style={{ width: PLAN.suggestion }}>
            <RecipeCard
              recipe={recipe}
              image={RECIPE_IMAGES[recipe.id]}
              size="medium"
              note={note}
              onPress={() => plan(recipe)}
              testID={`plan-suggest-${recipe.id}`}
            />
          </View>
        ))}
      </ScrollView>
      <Text variant="caption" colour="inkMuted" style={{ marginTop: SPACE.xs }}>
        {`Tap one to plan it for ${slot}.`}
      </Text>
    </View>
  );
}

type SummaryProps = { list: ShoppingList; meals: number; onOpen: () => void };

/** The black card under the week: how much to buy, a peek at the list, tap to open it. */
export function ListSummaryCard({ list, meals, onOpen }: SummaryProps) {
  const styles = useStyles();
  const toBuy = list.sections.flatMap((s) => s.items.filter((i) => !i.checked));
  const count = toBuy.length + list.extras.filter((x) => !x.checked).length;
  if (meals === 0 && list.extras.length === 0) return null;
  const preview = toBuy.slice(0, PREVIEW);
  const more = count - preview.length;
  const headline = count === 0 ? 'All bought' : `${count} ${count === 1 ? 'item' : 'items'} for ${meals} ${meals === 1 ? 'meal' : 'meals'}`;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Shopping list, ${headline}`}
      testID="plan-list-card"
      style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
    >
      <View style={{ flex: 1, gap: SPACE.xs }}>
        <Text variant="kickerSmall" colour="bgSoft">
          Shopping list
        </Text>
        <Text variant="cardTitleLarge" colour="bg">
          {headline}
        </Text>
        {preview.length ? (
          <View style={styles.chips}>
            {preview.map((i) => (
              <View key={i.key} style={styles.chip}>
                <Text variant="chip" colour="bg" numberOfLines={1}>
                  {capitalise(i.name)}
                </Text>
              </View>
            ))}
            {more > 0 ? (
              <View style={styles.chip}>
                <Text variant="chip" colour="bg">{`+${more} more`}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <Icon name="forward" size={20} colour="bg" />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  track: { flex: 1, height: PLAN.progress, borderRadius: PLAN.progress, backgroundColor: colours.bgSoft, overflow: 'hidden' },
  fill: { height: PLAN.progress, borderRadius: PLAN.progress, backgroundColor: colours.ink },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.xl,
    backgroundColor: colours.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xxs },
  chip: { paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xxs, borderRadius: RADIUS.pill, backgroundColor: colours.inkSoft },
  pressed: { opacity: 0.85 },
}));
