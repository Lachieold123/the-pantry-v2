// The pieces of the Plan tab around the day itself (spec §4.11–4.13): how
// full the week is, ideas for the day, and the black shopping-list card
// that opens the list. Sizes and spacing are v1's (CartModal), as tokens.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { planWhere } from '@/domain/plan/summary';
import { toISODate, type ISODate, type Slot } from '@/domain/plan/week';
import { capitalise, type ShoppingList } from '@/domain/shopping/derive';
import { useCookableNow } from '@/store/cookable';
import { usePlan } from '@/store/plan';
import { useForYou } from '@/store/suggestions';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { useToast } from '@/ui/patterns/Toast';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
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

type SuggestProps = {
  day: ISODate;
  /** The day's first empty meal; undefined when the day is full, and a tap opens the recipe instead. */
  slot: Slot | undefined;
};

/**
 * Ideas for the day: what the cupboard can make first, then picks for this
 * cook. Tapping one drops it into the day's first empty meal (v1), with undo.
 */
export function DaySuggestions({ day, slot }: SuggestProps) {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const { ready, nearly } = useCookableNow();
  const forYou = useForYou(RAIL * 3);
  const fits = (r: Recipe) => !slot || r.mealTypes.includes(slot);
  const fromCupboard = [...ready, ...nearly].map((m) => m.recipe).filter(fits);
  const fromPantry = fromCupboard.length > 0;
  const ideas = (fromPantry ? fromCupboard : forYou.filter(fits)).slice(0, RAIL);
  if (ideas.length === 0) return null;

  const pick = (recipe: Recipe) => {
    if (!slot) {
      router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
      return;
    }
    const entry = addEntry(recipe.id, day, slot, recipe.servings);
    toast({ message: `${recipe.title} planned for ${planWhere(day, slot, toISODate(new Date()))}`, undo: () => removeEntry(entry.id) });
  };
  return (
    <View>
      <View style={styles.sectionHead}>
        <Text variant="kickerSection">{fromPantry ? 'Suggested for this day' : 'Ideas for this day'}</Text>
        <Text variant="sectionTitle" accessibilityRole="header">
          {fromPantry ? 'From your cupboard' : 'Picked for you'}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railBleed} contentContainerStyle={styles.rail}>
        {ideas.map((recipe) => (
          <SuggestionCard key={recipe.id} recipe={recipe} slot={slot} onPress={() => pick(recipe)} />
        ))}
      </ScrollView>
    </View>
  );
}

function SuggestionCard({ recipe, slot, onPress }: { recipe: Recipe; slot: Slot | undefined; onPress: () => void }) {
  const styles = useStyles();
  const minutes = totalMinutes(recipe);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={slot ? `${recipe.title}. Add for ${slot}` : `${recipe.title}. Open recipe`}
      testID={`plan-suggest-${recipe.id}`}
      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
    >
      <RecipeImage source={RECIPE_IMAGES[recipe.id]} shape="card" cuisine={recipe.cuisine} radius={0} iconSize={26} />
      <View style={styles.suggestionBody}>
        <Text variant="eyebrow" tone={cuisineEyebrow(recipe.cuisine)} numberOfLines={1}>
          {CUISINE_LABELS[recipe.cuisine]}
        </Text>
        <Text variant="cardTitleSmall" numberOfLines={2}>
          {recipe.title}
        </Text>
        {minutes > 0 ? (
          <Text variant="metaSmall" colour="inkSoft">
            {formatMinutes(minutes)}
          </Text>
        ) : null}
      </View>
    </Pressable>
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
        <Text variant="kickerSection" colour="bgSoft">
          Shopping list
        </Text>
        <Text variant="cardTitleLarge" colour="bg">
          {headline}
        </Text>
        {preview.length ? (
          <View style={styles.chips}>
            {preview.map((i) => (
              <View key={i.key} style={styles.chip}>
                <Text variant="chipSmall" colour="bg" numberOfLines={1}>
                  {capitalise(i.name)}
                </Text>
              </View>
            ))}
            {more > 0 ? (
              <View style={styles.chip}>
                <Text variant="chipSmall" colour="bg">{`+${more} more`}</Text>
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
  track: { flex: 1, height: PLAN.progress, borderRadius: PLAN.progress, backgroundColor: colours.border, overflow: 'hidden' },
  fill: { height: PLAN.progress, borderRadius: PLAN.progress, backgroundColor: colours.ink },
  sectionHead: { gap: SPACE.xxs, paddingBottom: PLAN.afterSectionHead },
  railBleed: { marginHorizontal: -SPACE.gutter },
  rail: { gap: SPACE.sm, paddingHorizontal: SPACE.gutter, paddingBottom: PLAN.afterRail },
  suggestion: {
    width: PLAN.suggestion,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
    overflow: 'hidden',
  },
  suggestionBody: {
    paddingHorizontal: PLAN.cardBodyX,
    paddingTop: PLAN.cardBodyTop,
    paddingBottom: PLAN.cardBodyBottom,
    gap: SPACE.xxs,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: PLAN.listCardY,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.xl,
    backgroundColor: colours.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: PLAN.chipGap, marginTop: SPACE.xxs },
  chip: { paddingHorizontal: PLAN.chipX, paddingVertical: PLAN.chipY, borderRadius: RADIUS.pill, backgroundColor: colours.inkSoft },
  pressed: { opacity: 0.9 },
}));
