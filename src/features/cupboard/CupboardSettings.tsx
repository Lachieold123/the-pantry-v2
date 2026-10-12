// The Cupboard's setting rows, as v1's slim staples row (spec §7 Cupboard #7):
// hairlines above, between and below, the same type on every row, and the
// control lined up on the right. The staples switch sits just above the match
// shelves, as in v1, because it changes what they show; the other two sit at
// the foot. The shared ListRow and
// Switch each carry their own padding and type, which left these two out of
// line with each other, so the Cupboard draws its own pair.
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { Toggle } from '@/ui/primitives/Toggle';
import { makeStyles } from '@/ui/theme/makeStyles';
import { CUPBOARD } from '@/ui/tokens/cupboard';
import { ICON, PRESSED, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = {
  shelfDetail: string;
  onShelf: () => void;
  moveTicked: boolean;
  onMoveTicked: (value: boolean) => void;
};

export function CupboardSettings({ shelfDetail, onShelf, moveTicked, onMoveTicked }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Pressable
        onPress={onShelf}
        accessibilityRole="button"
        accessibilityLabel={`Always in my kitchen. ${shelfDetail}`}
        testID="cupboard-shelf"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.text}>
          <Text variant="rowSmall">Always in my kitchen</Text>
          <Text variant="caption">{shelfDetail}</Text>
        </View>
        <Icon name="forward" size={ICON.small} colour="inkMuted" />
      </Pressable>
      <View style={[styles.row, styles.divider]}>
        <View style={styles.text}>
          <Text variant="rowSmall">Move ticked shopping here</Text>
          <Text variant="caption">When you tick something off the list, it goes into the cupboard</Text>
        </View>
        <Toggle value={moveTicked} onChange={onMoveTicked} label="Move ticked shopping here" testID="cupboard-move-ticked" />
      </View>
    </View>
  );
}

type StaplesProps = { assume: boolean; ticked: number; onChange: (assume: boolean) => void };

/**
 * v1's "Assume I have pantry staples", saved this time. It flips the shelf
 * between "assume stocked" and "only what I tick"; salt, pepper, oil and
 * water count either way, and the caption says so.
 */
export function StaplesToggle({ assume, ticked, onChange }: StaplesProps) {
  const styles = useStyles();
  const mine = ticked === 0 ? 'No shelf items ticked yet' : `Only the ${ticked} shelf ${ticked === 1 ? 'item' : 'items'} you've ticked`;
  const detail = assume
    ? 'Spices, sauces and baking basics count as in. Salt, pepper, oil and water always do.'
    : `${mine}. Salt, pepper, oil and water always count.`;
  return (
    <View style={styles.block} testID="cupboard-staples-row">
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="rowSmall">Assume I have pantry staples</Text>
          <Text variant="caption">{detail}</Text>
        </View>
        <Toggle value={assume} onChange={onChange} label="Assume I have pantry staples" testID="cupboard-staples" />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  block: { borderTopWidth: 1, borderTopColor: colours.border, borderBottomWidth: 1, borderBottomColor: colours.border },
  row: { minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: CUPBOARD.settingPadY },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colours.border },
  text: { flex: 1, gap: SPACE.xxs / 2 },
  pressed: { opacity: PRESSED.row },
}));
