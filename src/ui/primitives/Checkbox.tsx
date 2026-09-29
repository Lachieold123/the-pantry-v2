// A tick box with its label, used for the shopping list. The whole row is the target.
import { Pressable, StyleSheet, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = { label: string; detail?: string; checked: boolean; onToggle: () => void };

export function Checkbox({ label, detail, checked, onToggle }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon name="check" size={14} colour="onAccent" /> : null}</View>
      <Text variant="body" colour={checked ? 'inkMuted' : 'ink'} style={[styles.label, checked && styles.struck]}>
        {label}
      </Text>
      {detail ? (
        <Text variant="meta" colour="inkSecondary" style={{ fontVariant: ['tabular-nums'] }}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: { minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xs },
  box: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm - 2,
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: colours.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colours.accent, borderColor: colours.accent },
  label: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
}));
