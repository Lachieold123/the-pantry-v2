// The ingredients peek (v1 CookModeModal): a sheet over the step, so a glance at
// the quantities never loses your place. Scaled to the servings you're cooking,
// with HAVE on what's in your cupboard and swap tips where there's one.
// It renders nothing while closed, like ModalSheet (audit ARCH-1); it has its own
// shell because v1's head (kicker over a serif name, left-aligned) isn't ModalSheet's.
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatLine, scaleLine, type UnitSystem } from '@/domain/ingredients/format';
import { substitutionFor } from '@/domain/recipes/substitutions';
import type { Recipe } from '@/domain/recipes/types';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { COOK } from '@/ui/tokens/cook';
import { PRESSED, RADIUS, SHADOW, SPACE } from '@/ui/tokens/type';

type Props = {
  visible: boolean;
  recipe: Recipe;
  servings: number;
  units: UnitSystem;
  have: ReadonlySet<string>;
  onClose: () => void;
};

export function CookIngredientsSheet({ visible, recipe, servings, units, have, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const ratio = servings / recipe.servings;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="sheet-backdrop"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACE.md) }]}
          accessibilityViewIsModal
          testID="cook-ingredients-sheet"
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text variant="kickerSection" colour="inkMuted" style={styles.kicker}>
              Ingredients
            </Text>
            <Text variant="brandMark" numberOfLines={1} accessibilityRole="header">
              {recipe.title}
            </Text>
            <Text variant="meta" colour="inkMuted">
              For {servings}
            </Text>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {recipe.ingredientGroups.map((group, gi) => (
              <View key={gi} style={styles.group}>
                {group.title ? (
                  <Text variant="kickerSmall" colour="inkMuted" style={styles.section} accessibilityRole="header">
                    {group.title}
                  </Text>
                ) : null}
                {group.items.map((line, li) => {
                  const inCupboard = line.ingredientId !== undefined && have.has(line.ingredientId);
                  const tip = substitutionFor(line.ingredientId);
                  const text = capitalise(formatLine(scaleLine(line, ratio), units));
                  return (
                    <View key={li}>
                      <View style={styles.row} accessible accessibilityLabel={inCupboard ? `${text}, in your cupboard` : text}>
                        <View style={styles.dot} />
                        <Text variant="bodyMedium" style={styles.item}>
                          {text}
                        </Text>
                        {inCupboard ? (
                          <View style={styles.have}>
                            <Icon name="check" size={COOK.haveIcon} colour="bg" />
                            <Text variant="pill" colour="bg">
                              Have
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {tip ? (
                        <View style={styles.tip}>
                          <Icon name="substitute" size={COOK.tipIcon} colour="accent" />
                          <Text variant="note" colour="inkMuted" style={styles.item}>
                            {tip}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}
            testID="cook-ingredients-done"
          >
            <Text variant="label" colour="bg">
              Back to cooking
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: FIXED.scrim },
  sheet: {
    backgroundColor: colours.bg,
    borderTopLeftRadius: RADIUS.big,
    borderTopRightRadius: RADIUS.big,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colours.border,
    paddingTop: SPACE.xs,
    shadowColor: FIXED.shadow,
    ...SHADOW.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: COOK.sheetHandleWidth,
    height: COOK.sheetHandleHeight,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.inkSubtle,
    marginBottom: COOK.sheetHandleBottom,
  },
  head: {
    paddingHorizontal: COOK.sheetHeadX,
    paddingBottom: COOK.sheetHeadBottom,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.border,
  },
  kicker: { marginBottom: COOK.sheetKickerBottom },
  list: { maxHeight: COOK.sheetListMax },
  listContent: { paddingHorizontal: COOK.sheetHeadX, paddingTop: COOK.sheetListTop, paddingBottom: COOK.sheetListBottom },
  group: { paddingVertical: COOK.sheetGroupY },
  section: { marginBottom: COOK.sheetSectionBottom },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: COOK.sheetRowGap, paddingVertical: COOK.sheetRowY },
  dot: { width: COOK.dot, height: COOK.dot, borderRadius: RADIUS.pill, backgroundColor: colours.accent, marginTop: COOK.dotTop },
  item: { flex: 1 },
  have: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: COOK.haveGap,
    paddingLeft: COOK.havePadLeft,
    paddingRight: COOK.havePadRight,
    paddingVertical: COOK.havePadY,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  tip: { flexDirection: 'row', gap: SPACE.xs, marginLeft: COOK.dot + COOK.sheetRowGap, marginBottom: COOK.tipBottom },
  done: {
    alignItems: 'center',
    marginHorizontal: COOK.sheetDoneX,
    marginTop: COOK.sheetDoneTop,
    paddingVertical: COOK.sheetDoneY,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  pressed: { opacity: PRESSED.subtle },
}));
