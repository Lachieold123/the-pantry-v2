// An icon on its own still needs a 44pt target and a spoken label. Shapes from
// the original (spec §4.4, §4.8): plain (header), square (pushed-screen back,
// 44 r14 grey), round (over a photo, 44 circle card) and chip (38 circle, grey
// with a border).
import { Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { RADIUS, TAP_TARGET } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';

/** squareOnSoft: the square back button on a grey page (Settings, Filters), where grey would vanish. */
type Shape = 'plain' | 'square' | 'squareOnSoft' | 'round' | 'chip' | 'filled';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  shape?: Shape;
  size?: number;
  colour?: keyof ColourTokens;
  disabled?: boolean;
  testID?: string | undefined;
};

export function IconButton({ icon, label, onPress, shape = 'plain', size, colour, disabled = false, testID }: Props) {
  const { colours } = useTheme();
  const frame: Record<Shape, ViewStyle> = {
    plain: {},
    square: { backgroundColor: colours.bgSoft, borderRadius: RADIUS.lg },
    squareOnSoft: { backgroundColor: colours.card, borderRadius: RADIUS.lg },
    round: { backgroundColor: colours.card, borderRadius: RADIUS.pill },
    chip: {
      width: 38,
      height: 38,
      backgroundColor: colours.bgSoft,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colours.border,
    },
    filled: { backgroundColor: colours.ink, borderRadius: RADIUS.lg },
  };
  const iconSize = size ?? (shape === 'chip' ? 18 : 22);
  const ink = colour ?? (shape === 'filled' ? 'bg' : 'ink');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      {...(testID ? { testID } : {})}
      hitSlop={shape === 'chip' ? 6 : 4}
      style={({ pressed }) => [
        { width: TAP_TARGET, height: TAP_TARGET, alignItems: 'center', justifyContent: 'center' },
        frame[shape],
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={iconSize} colour={disabled ? 'inkMuted' : ink} />
    </Pressable>
  );
}
