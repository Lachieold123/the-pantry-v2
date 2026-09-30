// The original's search box (spec §4.10): 46 tall, grey, rounded 14, with a
// clear button once there's text. Results update as you type.
import { Pressable, TextInput, View } from 'react-native';

import { textStyle } from '@/ui/theme/fonts';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { RADIUS, SPACE, TYPE } from '@/ui/tokens/type';
import { Icon } from './Icon';

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  label: string;
  onSubmit?: (() => void) | undefined;
  testID?: string | undefined;
};

export function SearchField({ value, onChange, placeholder, label, onSubmit, testID }: Props) {
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
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        maxFontSizeMultiplier={1.6}
        {...(onSubmit ? { onSubmitEditing: onSubmit } : {})}
        {...(testID ? { testID } : {})}
        style={styles.input}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12}>
          <Icon name="clear" size={18} colour="inkMuted" />
        </Pressable>
      ) : null}
    </View>
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
  input: { flex: 1, height: 46, color: colours.ink, ...textStyle(TYPE.body), lineHeight: undefined },
}));
