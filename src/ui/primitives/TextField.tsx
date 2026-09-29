// A labelled text input. The label is always visible, never only a placeholder.
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FONT, RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & { label: string; error?: string };

export function TextField({ label, error, ...input }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="kicker">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        style={[styles.input, error ? styles.invalid : null]}
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
  invalid: { borderColor: colours.danger },
}));
