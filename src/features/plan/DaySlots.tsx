// One day's meals (spec §4.12): Breakfast, Lunch and Dinner, each either the
// planned recipe as a slot card or a dashed "Add dinner" button. Past days
// are shown as they were, without the add buttons. The card is v1's; who
// it's for sits in a small pill that opens a servings sheet, so the day stays
// as tidy as v1's while the shopping list still scales to the right number.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes } from '@/domain/recipes/types';
import { entriesFor, SLOTS, type ISODate, type PlanEntry, type Slot } from '@/domain/plan/week';
import { usePlan } from '@/store/plan';
import { useRecipe } from '@/store/recipeBook';
import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { IconButton } from '@/ui/primitives/IconButton';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { makeStyles } from '@/ui/theme/makeStyles';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
import { PLAN, RADIUS, SPACE } from '@/ui/tokens/type';

const SLOT_NAMES: Record<Slot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function DaySlots({ day, entries, past }: { day: ISODate; entries: readonly PlanEntry[]; past: boolean }) {
  const router = useRouter();
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {SLOTS.map((slot, i) => {
        const inSlot = entriesFor(entries, day, slot);
        return (
          <View key={slot} style={[styles.block, i > 0 && styles.divided]}>
            <Text variant="kickerSmall" style={styles.kicker}>
              {SLOT_NAMES[slot]}
            </Text>
            <View style={{ gap: SPACE.xs }}>
              {inSlot.map((e) => (
                <SlotCard key={e.id} entry={e} past={past} />
              ))}
              {inSlot.length === 0 && past ? <Text variant="meta">Nothing planned</Text> : null}
              {inSlot.length === 0 && !past ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/plan/add', params: { day, slot } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${SLOT_NAMES[slot].toLowerCase()}`}
                  testID={`plan-add-${day}-${slot}`}
                  style={({ pressed }) => [styles.empty, pressed && styles.pressed]}
                >
                  <Icon name="add" size={16} colour="inkSoft" />
                  <Text variant="chip" colour="inkSoft">{`Add ${SLOT_NAMES[slot].toLowerCase()}`}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SlotCard({ entry, past }: { entry: PlanEntry; past: boolean }) {
  const router = useRouter();
  const styles = useStyles();
  const theme = useTheme().name;
  const toast = useToast();
  const recipe = useRecipe(entry.recipeId);
  const removeEntry = usePlan((s) => s.removeEntry);
  const restoreEntry = usePlan((s) => s.restoreEntry);
  const [servingsOpen, setServingsOpen] = useState(false);
  const remove = () => {
    const removed = removeEntry(entry.id);
    if (removed) toast({ message: `${recipe?.title ?? 'Meal'} taken off the plan`, undo: () => restoreEntry(removed) });
  };
  if (!recipe) {
    return (
      <View style={styles.card}>
        <Text variant="meta" style={{ flex: 1 }}>
          A recipe that’s no longer available
        </Text>
        <IconButton
          icon="close"
          label="Remove from plan"
          onPress={remove}
          colour="inkMuted"
          size={16}
          testID={`plan-entry-${entry.id}-remove`}
        />
      </View>
    );
  }
  const minutes = totalMinutes(recipe);
  const difficulty = recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1);
  return (
    <>
      <Pressable
        onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${recipe.title}, for ${entry.servings}`}
        testID={`plan-entry-${entry.id}`}
        style={({ pressed }) => [styles.card, past && styles.past, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          <RecipeImage source={RECIPE_IMAGES[recipe.id]} shape="square" cuisine={recipe.cuisine} radius={RADIUS.sm} iconSize={22} />
        </View>
        <View style={{ flex: 1, gap: PLAN.hair }}>
          <Text variant="eyebrow" tone={cuisineEyebrow(recipe.cuisine, theme)} numberOfLines={1}>
            {CUISINE_LABELS[recipe.cuisine]}
          </Text>
          <Text variant="cardTitleMedium" numberOfLines={1}>
            {recipe.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="meta" colour="inkSoft" numberOfLines={1}>
              {minutes > 0 ? `${formatMinutes(minutes)} · ${difficulty}` : difficulty}
            </Text>
            {past ? (
              <Text variant="meta" colour="inkSoft">{`· For ${entry.servings}`}</Text>
            ) : (
              <Pressable
                onPress={() => setServingsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`For ${entry.servings}. Change how many it's for`}
                hitSlop={8}
                testID={`plan-entry-${entry.id}-servings`}
                style={({ pressed }) => [styles.servings, pressed && styles.pressed]}
              >
                <Text variant="metaSmall" colour="ink">{`For ${entry.servings}`}</Text>
              </Pressable>
            )}
          </View>
        </View>
        {past ? null : (
          <IconButton
            icon="close"
            label={`Take ${recipe.title} off the plan`}
            onPress={remove}
            colour="inkMuted"
            size={16}
            testID={`plan-entry-${entry.id}-remove`}
          />
        )}
      </Pressable>
      <ServingsSheet entry={entry} visible={servingsOpen} onClose={() => setServingsOpen(false)} title={recipe.title} />
    </>
  );
}

function ServingsSheet({ entry, visible, onClose, title }: { entry: PlanEntry; visible: boolean; onClose: () => void; title: string }) {
  const setServings = usePlan((s) => s.setServings);
  return (
    <ModalSheet visible={visible} onClose={onClose} title={`Who’s ${title} for?`} testID="plan-servings-sheet">
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm }}>
        <View style={{ alignSelf: 'center' }}>
          <Stepper
            label="People"
            value={entry.servings}
            onChange={(n) => setServings(entry.id, n)}
            format={(n) => `For ${n}`}
            testID={`plan-entry-${entry.id}-stepper`}
          />
        </View>
        <Text variant="meta" align="center">
          The shopping list scales to match.
        </Text>
      </View>
      <Button label="Done" kind="primary" block onPress={onClose} testID="plan-servings-done" />
    </ModalSheet>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  list: { paddingBottom: PLAN.afterSlots },
  block: { paddingVertical: SPACE.sm },
  divided: { borderTopWidth: 1, borderTopColor: colours.border },
  kicker: { marginBottom: SPACE.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    padding: PLAN.slotPad,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
  past: { opacity: 0.6 },
  thumb: { width: PLAN.thumb },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, marginTop: PLAN.hair },
  servings: {
    paddingHorizontal: SPACE.xs,
    paddingVertical: PLAN.hair,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bg,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PLAN.chipGap,
    paddingVertical: PLAN.rowY,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colours.inkSubtle,
  },
  pressed: { opacity: 0.7 },
}));
