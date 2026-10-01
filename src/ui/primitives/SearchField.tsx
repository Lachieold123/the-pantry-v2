// The original's search box (spec §4.10): 46 tall, grey, rounded 14, with a
// clear button once there's text. Results update as you type.
import { Pressable, TextInput, View } from 'react-native';

import { textStyle } from '@/ui/theme/fonts';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { PRESSED, RADIUS, SPACE, TYPE } from '@/ui/tokens/type';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  label: string;
  onSubmit?: (() => void) | undefined;
  /** Opens the keyboard straight away, when the page was opened to search. */
  autoFocus?: boolean | undefined;
  testID?: string | undefined;
};

export function SearchField({ value, onChange, placeholder, label, onSubmit, autoFocus = false, testID }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  return (
    <View style={styles.box}>
      <Icon name="search" size={18} colour="inkMuted" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        accessibilityLabel={label}
        returnKeyType="search"
        autoFocus={autoFocus}
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
          hitSlop={12}
          {...(testID ? { testID: `${testID}-clear` } : {})}
        >
          <Icon name="clear" size={18} colour="inkMuted" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Looks like the search box but opens a search page (Home's "Search recipes", D-033). */
export function SearchButton({ placeholder, onPress, testID }: { placeholder: string; onPress: () => void; testID?: string | undefined }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      {...(testID ? { testID } : {})}
      style={({ pressed }) => [styles.box, styles.alone, pressed && { opacity: PRESSED.row }]}
    >
      <Icon name="search" size={18} colour="inkMuted" />
      <Text variant="body" colour="inkMuted" numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  box: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
  // On its own in a column it keeps its height; the field version grows across a row.
  alone: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  input: { flex: 1, height: 46, color: colours.ink, ...textStyle(TYPE.body), lineHeight: undefined },
}));
