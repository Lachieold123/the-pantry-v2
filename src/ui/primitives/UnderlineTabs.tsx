// Text tabs with an ink underline under the chosen one: "This week | Shopping
// list", "Messages | Notifications" (spec §4.9). Left-aligned by default; `fill`
// spreads them evenly with a shorter underline, as the inbox does.
import { Pressable, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Text } from './Text';

type Props<T extends string> = {
  options: readonly { value: T; label: string; badge?: number | undefined }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  fill?: boolean;
};

export function UnderlineTabs<T extends string>({ options, value, onChange, label, fill = false }: Props<T>) {
  const styles = useStyles();
  return (
    <View style={[styles.strip, fill && styles.stripFill]} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge} new` : o.label}
            testID={`tab-${o.value}`}
            style={[styles.tab, fill && styles.tabFill]}
          >
            <Text variant="rowSmall" colour={selected ? 'ink' : 'inkMuted'} style={styles.label}>
              {o.label}
            </Text>
            <View style={[styles.line, fill && styles.lineFill, selected && styles.lineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  strip: { flexDirection: 'row', gap: 22, paddingHorizontal: SPACE.gutter, borderBottomWidth: 1, borderBottomColor: colours.border },
  stripFill: { gap: 0 },
  tab: { minHeight: TAP_TARGET, justifyContent: 'flex-end' },
  tabFill: { flex: 1, alignItems: 'center' },
  label: { fontWeight: '700', paddingBottom: SPACE.sm },
  line: { height: 2, marginBottom: -1, alignSelf: 'stretch', borderRadius: 1, backgroundColor: 'transparent' },
  lineFill: { alignSelf: 'center', width: '60%' },
  lineOn: { backgroundColor: colours.ink },
}));
