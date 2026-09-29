// Buttons. Four kinds, all at least 44pt tall (map §11). Every button on
// screen must do something real (map rule 4), so `onPress` is required.
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonKind = 'primary' | 'secondary' | 'quiet' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  /** Stretch to fill the row. */
  block?: boolean;
  accessibilityHint?: string | undefined;
};

export function Button({
  label,
  onPress,
  kind = 'secondary',
  icon,
  disabled = false,
  busy = false,
  block = false,
  accessibilityHint,
}: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  const inkKey = kind === 'primary' ? 'onAccent' : kind === 'destructive' ? 'danger' : kind === 'quiet' ? 'accent' : 'ink';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [styles.base, styles[kind], block && styles.block, (pressed || disabled) && styles.dim]}
    >
      <View style={styles.row}>
        {busy ? <ActivityIndicator size="small" color={colours[inkKey]} /> : icon ? <Icon name={icon} size={18} colour={inkKey} /> : null}
        <Text variant="ui" colour={inkKey}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  base: {
    minHeight: TAP_TARGET,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  block: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  primary: { backgroundColor: colours.accent },
  secondary: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colours.rule, backgroundColor: colours.surface },
  quiet: { paddingHorizontal: SPACE.sm },
  destructive: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colours.danger },
  dim: { opacity: 0.6 },
}));
