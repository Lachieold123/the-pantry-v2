// The Cupboard tab's lists, in v1's editorial look (spec §7 Cupboard):
// "Add one thing" rows with an italic numeral, the jars grouped by category
// under a thin coloured rule, and one scrolling row of quick adds.
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { CUPBOARD_CATEGORIES } from '@/domain/cupboard/kitchen';
import { ingredientName } from '@/store/cookable';
import { JarChip } from '@/ui/patterns/JarChip';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CUPBOARD } from '@/ui/tokens/cupboard';
import { PANTRY_CATEGORY, PANTRY_CATEGORY_DARK } from '@/ui/tokens/cuisine';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';
import { capitalise, CATEGORY_LABEL } from './CupboardParts';

type UnlockProps = { unlocks: { id: string; unlocks: number }[]; onHave: (id: string) => void; onList: (id: string) => void };

/**
 * v1 had one round "+" per row. v2 offers two honest answers ("I have it"
 * and "put it on the list"), so they're a matching pair of small pills under
 * the name rather than two unequal buttons squeezing the title.
 */
export function UnlockRows({ unlocks, onHave, onList }: UnlockProps) {
  const styles = useStyles();
  if (unlocks.length === 0) return null;
  return (
    <View>
      <SectionHeader kicker="Unlock more" title="Add one thing" />
      {unlocks.map((u, i) => {
        const name = capitalise(ingredientName(u.id));
        return (
          <View key={u.id} style={[styles.unlock, i > 0 && styles.divider]} testID={`unlock-${u.id}`}>
            <Text variant="cupboardNumeral" colour="inkSubtle" align="center" style={styles.numeral} maxFontSizeMultiplier={1.3}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <View style={styles.unlockText}>
              <Text variant="cupboardUnlockTitle" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption">{u.unlocks === 1 ? 'Makes 1 more recipe ready' : `Makes ${u.unlocks} more recipes ready`}</Text>
              <View style={styles.actions}>
                <SmallPill
                  icon="check"
                  label="I have it"
                  a11y={`I have ${name}`}
                  onPress={() => onHave(u.id)}
                  testID={`unlock-${u.id}-have`}
                />
                <SmallPill
                  icon="add"
                  label="Add to list"
                  a11y={`Add ${name} to the shopping list`}
                  onPress={() => onList(u.id)}
                  testID={`unlock-${u.id}-list`}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SmallPill({
  icon,
  label,
  a11y,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  a11y: string;
  onPress: () => void;
  testID: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={{ top: CUPBOARD.actionSlop, bottom: CUPBOARD.actionSlop }}
      testID={testID}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Icon name={icon} size={CUPBOARD.actionIcon} colour="ink" />
      <Text variant="cupboardQuickAdd">{label}</Text>
    </Pressable>
  );
}

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
  unlock: { flexDirection: 'row', alignItems: 'flex-start', gap: CUPBOARD.unlockGap, paddingVertical: CUPBOARD.unlockPadY },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colours.border },
  numeral: { width: CUPBOARD.numeralWidth },
  unlockText: { flex: 1, minWidth: 0, gap: CUPBOARD.unlockTextGap },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xs },
  pill: {
    minHeight: CUPBOARD.actionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CUPBOARD.actionGap,
    paddingHorizontal: CUPBOARD.actionPadX,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
  },
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
