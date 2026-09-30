// Chips, in the original's three shapes (spec §4.7): filter (white with a
// border, ink when on), quick (grey, ink when on) and dropdown (grey with a
// chevron). Checkable chips announce their state to VoiceOver; action chips
// ("+ rice") are plain buttons, since there's nothing to be checked.
import { Pressable } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  kind?: 'filter' | 'quick' | 'dropdown';
  icon?: IconName;
  /**
   * checkbox: an on/off toggle. radio: one choice among several (a diet, a day).
   * button: an action that adds or removes something; pass an `accessibilityLabel`
   * that says so ("Add rice"), as VoiceOver can't read the + icon.
   */
  role?: 'checkbox' | 'radio' | 'button';
  /** What VoiceOver says, when the visible text alone doesn't say what a tap does. Must contain the visible words. */
  accessibilityLabel?: string;
  testID?: string | undefined;
};

export function Chip({ label, selected, onPress, kind = 'filter', icon, role = 'checkbox', accessibilityLabel, testID }: Props) {
  const styles = useStyles();
  const ink = selected ? 'bg' : 'ink';
  const button = kind === 'dropdown' || role === 'button';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={button ? 'button' : role}
      accessibilityState={kind === 'dropdown' ? { expanded: selected } : button ? {} : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
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
  target: { minHeight: TAP_TARGET },
}));
