// The original’s search box (spec §4.10): at least 46 tall, grey, rounded 14, with a
// clear button once there's text. Results update as you type.
import { Pressable, TextInput, View } from 'react-native';

import { textStyle } from '@/ui/theme/fonts';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CHROME, hitSlopFor, RADIUS, SPACE, TYPE } from '@/ui/tokens/type';
import { Icon } from './Icon';

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  label: string;
  onSubmit?: (() => void) | undefined;
  testID?: string | undefined;
};

const SEARCH_ICON = 18;

export function SearchField({ value, onChange, placeholder, label, onSubmit, testID }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  return (
    <View style={styles.box}>
      <Icon name="search" size={SEARCH_ICON} colour="inkMuted" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        accessibilityLabel={label}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        maxFontSizeMultiplier={1.6}
        // With a submit action (add the top match), the keyboard stays up for the next one.
        {...(onSubmit ? { onSubmitEditing: onSubmit, submitBehavior: 'submit' as const } : {})}
        {...(testID ? { testID } : {})}
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={hitSlopFor(SEARCH_ICON, SEARCH_ICON)}
          {...(testID ? { testID: `${testID}-clear` } : {})}
        >
          <Icon name="clear" size={SEARCH_ICON} colour="inkMuted" />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  box: {
    flex: 1,
    // A minimum, not a fixed height, so text at the largest sizes isn't clipped (audit F105).
    minHeight: CHROME.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
  input: { flex: 1, minHeight: CHROME.field, color: colours.ink, ...textStyle(TYPE.body), lineHeight: undefined },
}));
