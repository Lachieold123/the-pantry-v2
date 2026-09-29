// A labelled text input. The label is always visible, never only a placeholder.
// Multi-line fields (ingredients, method) grow with their text.
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FONT, RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & { label: string; hint?: string | undefined; error?: string | undefined };

export function TextField({ label, hint, error, ...input }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="kicker">{label}</Text>
      {hint ? <Text variant="meta">{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        {...(hint ? { accessibilityHint: hint } : {})}
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        style={[styles.input, input.multiline ? styles.multiline : null, error ? styles.invalid : null]}
        {...input}
      />
      {error ? (
        <Text variant="meta" colour="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { gap: SPACE.xs },
  input: {
    minHeight: TAP_TARGET,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colours.rule,
    backgroundColor: colours.surface,
    color: colours.ink,
    fontFamily: FONT.sans,
    fontSize: TYPE.ui.fontSize,
  },
  multiline: { minHeight: TAP_TARGET * 3, paddingVertical: SPACE.sm, textAlignVertical: 'top', lineHeight: TYPE.ui.lineHeight + 4 },
  invalid: { borderColor: colours.danger },
}));
