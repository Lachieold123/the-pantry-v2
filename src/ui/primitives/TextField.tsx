// A labelled text input. The label is always visible, never only a placeholder.
// Multi-line fields (ingredients, method) grow with their text.
import { TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { textStyle } from '@/ui/theme/fonts';
import { RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';
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
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
    color: colours.ink,
    ...textStyle(TYPE.body),
    lineHeight: undefined,
  },
  multiline: { minHeight: TAP_TARGET * 3, paddingVertical: SPACE.sm, textAlignVertical: 'top', lineHeight: TYPE.body.lineHeight },
  invalid: { borderColor: colours.danger },
}));
