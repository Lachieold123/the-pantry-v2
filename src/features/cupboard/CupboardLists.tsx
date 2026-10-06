// The Cupboard tab's lists, in v1's editorial look (spec §7 Cupboard): the
// jars grouped by category under a thin coloured rule, and one scrolling row
// of quick adds.
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { CUPBOARD_CATEGORIES } from '@/domain/cupboard/kitchen';
import { ingredientName } from '@/store/cookable';
import { JarChip } from '@/ui/patterns/JarChip';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CUPBOARD } from '@/ui/tokens/cupboard';
import { PANTRY_CATEGORY, PANTRY_CATEGORY_DARK } from '@/ui/tokens/cuisine';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';
import { capitalise, CATEGORY_LABEL } from './CupboardParts';

type JarProps = { ids: readonly string[]; onRemove: (id: string) => void };

export function Jars({ ids, onRemove }: JarProps) {
  const styles = useStyles();
  const dark = useTheme().name === 'dark';
  const palette = dark ? PANTRY_CATEGORY_DARK : PANTRY_CATEGORY;
  const groups = CUPBOARD_CATEGORIES.map((category) => ({
    category,
    ids: ids.filter((id) => KITCHEN.category(id) === category).sort((a, b) => ingredientName(a).localeCompare(ingredientName(b))),
  })).filter((g) => g.ids.length > 0);
  return (
    <View style={styles.groups}>
      {groups.map((g) => (
        <View key={g.category} testID={`jar-group-${g.category}`}>
          <View
            style={styles.groupHead}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${CATEGORY_LABEL[g.category]}, ${g.ids.length}`}
          >
            <Text variant="cupboardGroupName" numberOfLines={1} style={styles.groupName}>
              {CATEGORY_LABEL[g.category]}
            </Text>
            <View style={[styles.rule, { backgroundColor: palette[g.category].soft }]} />
            <Text variant="cupboardGroupCount" colour="inkMuted">
              {String(g.ids.length)}
            </Text>
          </View>
          <View style={styles.jars}>
            {g.ids.map((id) => (
              <JarChip
                key={id}
                name={ingredientName(id)}
                category={g.category}
                onRemove={() => onRemove(id)}
                testID={`cupboard-item-${id}`}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function QuickAdds({ ids, onAdd }: { ids: readonly string[]; onAdd: (id: string) => void }) {
  const styles = useStyles();
  if (ids.length === 0) return null;
  return (
    <View style={styles.quickBlock}>
      <Text variant="kickerSection" accessibilityRole="header">
        Quick adds
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.quickRow}>
        {ids.map((id) => {
          const name = capitalise(ingredientName(id));
          return (
            <Pressable
              key={id}
              onPress={() => onAdd(id)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${name} to the cupboard`}
              hitSlop={{ top: CUPBOARD.actionSlop, bottom: CUPBOARD.actionSlop }}
              testID={`quick-add-${id}`}
              style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
            >
              {/* v1's plus is deliberately faint: the name is what you read. */}
              <View style={styles.quickIcon}>
                <Icon name="add" size={CUPBOARD.quickIcon} colour="inkSoft" />
              </View>
              <Text variant="cupboardQuickAdd">{name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  pressed: { opacity: PRESSED.row },
  groups: { gap: CUPBOARD.groupGap },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: CUPBOARD.groupHeadGap, marginBottom: CUPBOARD.groupHeadGap },
  groupName: { opacity: CUPBOARD.groupNameOpacity },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, opacity: CUPBOARD.groupRuleOpacity },
  jars: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: CUPBOARD.jarGap },
  quickBlock: { gap: SPACE.sm },
  bleed: { marginHorizontal: -SPACE.gutter },
  quickRow: { gap: CUPBOARD.quickGap, paddingHorizontal: SPACE.gutter },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CUPBOARD.quickIconGap,
    paddingLeft: CUPBOARD.quickPadLeft,
    paddingRight: CUPBOARD.quickPadRight,
    paddingVertical: CUPBOARD.quickPadY,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
  },
  quickIcon: { opacity: CUPBOARD.quickIconOpacity },
}));
