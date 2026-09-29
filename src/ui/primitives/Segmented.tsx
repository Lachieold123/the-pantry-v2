// A row of mutually exclusive choices: List | Cupboard, Light | Dark | System.
import { Pressable, StyleSheet, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Text } from './Text';

type Props<T extends string> = { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string };

export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant="ui" colour={selected ? 'ink' : 'inkSecondary'} align="center">
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  track: { flexDirection: 'row', backgroundColor: colours.surfaceSunken, borderRadius: RADIUS.md, padding: SPACE.xxs, gap: SPACE.xxs },
  segment: {
    flex: 1,
    minHeight: TAP_TARGET - SPACE.xs,
    borderRadius: RADIUS.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xs,
  },
  selected: { backgroundColor: colours.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colours.rule },
}));
