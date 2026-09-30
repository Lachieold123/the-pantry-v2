// A pill track of mutually exclusive choices (Recipes | People, Light | Dark).
// The chosen one fills with ink, as in the original (spec §4.9).
import { Pressable, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { CHROME, hitSlopFor, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Text } from './Text';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'md' | 'sm';
};

export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: Props<T>) {
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
            testID={`segment-${o.value}`}
            {...(size === 'sm' ? { hitSlop: hitSlopFor(CHROME.segmentSmall) } : {})}
            style={[styles.segment, size === 'sm' && styles.small, selected && styles.selected]}
          >
            <Text
              variant={size === 'sm' ? 'chip' : 'row'}
              colour={selected ? 'bg' : 'inkMuted'}
              align="center"
              style={selected ? styles.boldLabel : null}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  track: { flexDirection: 'row', backgroundColor: colours.bgSoft, borderRadius: RADIUS.pill, padding: SPACE.xxs },
  segment: { flex: 1, minHeight: TAP_TARGET, justifyContent: 'center', borderRadius: RADIUS.pill, paddingHorizontal: SPACE.xs },
  small: { minHeight: CHROME.segmentSmall },
  selected: { backgroundColor: colours.ink },
  boldLabel: { fontWeight: '800' },
}));
