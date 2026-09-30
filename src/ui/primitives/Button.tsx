// Buttons, in the original app's shapes (spec §4.8): black pill (primary),
// amber pill (accent), outlined pill (secondary), grey pill (soft), text link
// (quiet) and a danger variant. All at least 44pt tall; `onPress` is required
// because every visible button must do something real.
import { ActivityIndicator, Pressable, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonKind = 'primary' | 'accent' | 'secondary' | 'soft' | 'quiet' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  size?: 'md' | 'lg';
  icon?: IconName;
  /** Icon after the label ("Cook this →"). */
  trailingIcon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  /** Stretch to fill the row. */
  block?: boolean;
  accessibilityHint?: string | undefined;
  testID?: string | undefined;
};

const INK: Record<ButtonKind, keyof ColourTokens> = {
  primary: 'bg',
  accent: 'onAccent',
  secondary: 'ink',
  soft: 'ink',
  quiet: 'inkMuted',
  destructive: 'danger',
};

export function Button({
  label,
  onPress,
  kind = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  disabled = false,
  busy = false,
  block = false,
  accessibilityHint,
  testID,
}: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  const ink = INK[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(testID ? { testID } : {})}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        styles[kind],
        block && styles.block,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {busy ? <ActivityIndicator size="small" color={colours[ink]} /> : icon ? <Icon name={icon} size={18} colour={ink} /> : null}
        <Text variant={size === 'lg' ? 'labelLarge' : 'label'} colour={ink}>
          {label}
        </Text>
        {trailingIcon ? <Icon name={trailingIcon} size={16} colour={ink} /> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  base: {
    minHeight: TAP_TARGET,
    paddingHorizontal: SPACE.gutter,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  large: { paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg },
  block: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  primary: { backgroundColor: colours.ink },
  accent: { backgroundColor: colours.accent },
  secondary: { borderWidth: 1, borderColor: colours.border },
  soft: { backgroundColor: colours.bgSoft },
  quiet: { paddingHorizontal: SPACE.xs },
  destructive: { backgroundColor: colours.bgSoft },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
}));
