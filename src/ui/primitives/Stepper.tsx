// Minus / value / plus, for servings. Announces as an adjustable control to VoiceOver.
import { StyleSheet, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  format?: (n: number) => string;
  /** The control's id; its buttons get `-minus` and `-plus` after it. */
  testID?: string | undefined;
};

export function Stepper({ value, onChange, min = 1, max = 24, label, format = String, testID }: Props) {
  const styles = useStyles();
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      {...(testID ? { testID } : {})}
    >
      <IconButton
        icon="remove"
        label={`Fewer ${label.toLowerCase()}`}
        onPress={() => step(-1)}
        disabled={value <= min}
        testID={testID ? `${testID}-minus` : undefined}
      />
      <View style={styles.value}>
        <Text variant="row" align="center" style={{ fontVariant: ['tabular-nums'] }}>
          {format(value)}
        </Text>
      </View>
      <IconButton
        icon="add"
        label={`More ${label.toLowerCase()}`}
        onPress={() => step(1)}
        disabled={value >= max}
        testID={testID ? `${testID}-plus` : undefined}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colours.border,
    borderRadius: RADIUS.lg,
  },
  value: { minWidth: 36, paddingHorizontal: SPACE.xxs },
}));
