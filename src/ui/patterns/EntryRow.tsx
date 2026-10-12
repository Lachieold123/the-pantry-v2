// One line to type into with its button beside it: v1's My recipes rows
// ("Add a meal…  [Add]", "Paste a recipe URL…  [Import]", spec §7). The field
// has no visible label in v1, so the label is spoken instead; a problem shows
// under the row in words.
import { TextInput, View, type TextInputProps } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { textStyle } from '@/ui/theme/fonts';
import { RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';

type Props = Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoCorrect' | 'returnKeyType'> & {
  /** Spoken name of the field. */
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  action: string;
  onSubmit: () => void;
  busy?: boolean;
  error?: string | undefined;
  testID: string;
};

export function EntryRow({ label, placeholder, value, onChangeText, action, onSubmit, busy, error, testID, ...input }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={colours.inkMuted}
          selectionColor={colours.accent}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          editable={!busy}
          style={[styles.input, error ? styles.invalid : null]}
          testID={testID}
          {...input}
        />
        <Button label={action} kind="accent" busy={busy === true} disabled={busy === true} onPress={onSubmit} testID={`${testID}-submit`} />
      </View>
      {error ? (
        <Text variant="meta" colour="danger" accessibilityLiveRegion="polite" testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { gap: SPACE.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  input: {
    flex: 1,
    minHeight: TAP_TARGET,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.field,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
    color: colours.ink,
    ...textStyle(TYPE.body),
    lineHeight: undefined,
  },
  invalid: { borderColor: colours.danger },
}));
