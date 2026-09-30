// Chips, in the original's three shapes (spec §4.7): filter (white with a
// border, ink when on), quick (grey, ink when on) and dropdown (grey with a
// chevron). Checkable chips announce their state to VoiceOver.
import { Pressable } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  kind?: 'filter' | 'quick' | 'dropdown';
  icon?: IconName;
  /** For a single choice among several (radio) rather than an on/off toggle. */
  role?: 'checkbox' | 'radio';
  testID?: string | undefined;
};

export function Chip({ label, selected, onPress, kind = 'filter', icon, role = 'checkbox', testID }: Props) {
  const styles = useStyles();
  const ink = selected ? 'bg' : 'ink';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={kind === 'dropdown' ? 'button' : role}
      accessibilityState={kind === 'dropdown' ? { expanded: selected } : { checked: selected }}
      accessibilityLabel={label}
      {...(testID ? { testID } : {})}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.chip, kind !== 'filter' && styles.soft, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={14} colour={ink} /> : null}
      <Text variant="chip" colour={ink}>
        {label}
      </Text>
      {kind === 'dropdown' ? <Icon name="down" size={14} colour={ink} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bg,
  },
  soft: { backgroundColor: colours.bgSoft, paddingHorizontal: 14 },
  selected: { backgroundColor: colours.ink, borderColor: colours.ink },
  pressed: { opacity: 0.8 },
}));
