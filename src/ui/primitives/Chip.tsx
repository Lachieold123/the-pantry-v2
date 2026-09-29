// A small toggle for filters and choices.
import { Pressable, StyleSheet } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { Text } from './Text';

type Props = { label: string; selected: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text variant="ui" colour={selected ? 'onAccent' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  chip: {
    minHeight: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colours.rule,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colours.accent, borderColor: colours.accent },
  pressed: { opacity: 0.7 },
}));
