// The shopping list's pieces in v1's look (spec §4.13): soft cards with a
// line between rows, amber aisle headings, small outline pills, and a quiet
// "add an item" row at the foot of the list.
import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { capitalise, type ShoppingItem } from '@/domain/shopping/derive';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { textStyle } from '@/ui/theme/fonts';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { PLAN, RADIUS, SPACE, TYPE } from '@/ui/tokens/type';

export function ListCard({ title, children }: { title?: string | undefined; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: SPACE.xs }}>
      {title ? (
        <Text variant="kickerSmall" colour="accent" accessibilityRole="header" style={styles.aisle}>
          {title}
        </Text>
      ) : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type RowProps = {
  label: string;
  detail?: string | undefined;
  checked: boolean;
  first: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeLabel: string;
  testID: string;
};

export function ShoppingRow({ label, detail, checked, first, onToggle, onRemove, removeLabel, testID }: RowProps) {
  const styles = useStyles();
  return (
    <View style={[styles.row, !first && styles.divided]}>
      <View style={{ flex: 1 }}>
        <Checkbox label={label} {...(detail ? { detail } : {})} checked={checked} onToggle={onToggle} testID={testID} />
      </View>
      <IconButton icon="close" label={removeLabel} onPress={onRemove} colour="inkMuted" size={16} testID={`${testID}-remove`} />
    </View>
  );
}

/** The last row of the list: type something that isn't in any recipe ("dishwashing liquid"). */
export function AddItemRow({ onAdd, first }: { onAdd: (text: string) => void; first: boolean }) {
  const styles = useStyles();
  const { colours } = useTheme();
  const [text, setText] = useState('');
  const add = () => {
    if (text.trim()) onAdd(text.trim());
    setText('');
  };
  return (
    <View style={[styles.row, styles.addRow, !first && styles.divided]}>
      <Icon name="add" size={18} colour="inkMuted" />
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        placeholder="Add something else"
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        returnKeyType="done"
        maxLength={60}
        accessibilityLabel="Add something else to the list"
        testID="shopping-add-extra"
        style={[textStyle(TYPE.body), styles.input, { color: colours.ink }]}
      />
    </View>
  );
}

type PillProps = { label: string; icon?: IconName; on?: boolean; onPress: () => void; testID: string; role?: 'button' | 'switch' };

/** v1's small outline pill ("By aisle", "Clear all", the week choice); ink-filled when on. */
export function Pill({ label, icon, on = false, onPress, testID, role = 'button' }: PillProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      {...(role === 'switch' ? { accessibilityState: { checked: on } } : { accessibilityState: { selected: on } })}
      hitSlop={6}
      testID={testID}
      style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.7 }]}
    >
      {icon ? <Icon name={icon} size={14} colour={on ? 'bg' : 'inkMuted'} /> : null}
      <Text variant="chipSmall" colour={on ? 'bg' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function itemLabel(item: ShoppingItem): string {
  return item.optional ? `${capitalise(item.name)} (optional)` : capitalise(item.name);
}

const useStyles = makeStyles(({ colours }) => ({
  aisle: { paddingHorizontal: SPACE.xxs },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: PLAN.rowX, paddingRight: SPACE.xs },
  addRow: { gap: SPACE.sm, minHeight: PLAN.addRowMin },
  input: { flex: 1, paddingVertical: PLAN.rowY },
  divided: { borderTopWidth: 1, borderTopColor: colours.border },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    paddingVertical: PLAN.pillY,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
  },
  pillOn: { backgroundColor: colours.ink, borderColor: colours.ink },
}));
