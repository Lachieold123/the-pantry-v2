// A search box with a clear button. Results update as you type.
import { StyleSheet, TextInput, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FONT, RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type Props = { value: string; onChange: (text: string) => void; placeholder: string; label: string };

export function SearchField({ value, onChange, placeholder, label }: Props) {
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
        style={styles.input}
      />
      {value ? <IconButton icon="close" label="Clear search" onPress={() => onChange('')} colour="inkMuted" /> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  box: {
    flex: 1,
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingLeft: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colours.rule,
    backgroundColor: colours.surface,
  },
  input: { flex: 1, minHeight: TAP_TARGET, color: colours.ink, fontFamily: FONT.sans, fontSize: TYPE.ui.fontSize },
}));
