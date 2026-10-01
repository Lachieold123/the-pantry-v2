// The spinner's supporting pieces (spec §7): the header with the deck
// counter, the setting chips and their pickers, "Why this", and the sheet
// that explains how it works.
import { View } from 'react-native';

import { MEAL_TYPE_LABELS, TIME_FILTER_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import type { Reason, SpinSettings } from '@/domain/suggestions/spinner';
import { DropdownChips, type Dropdown } from '@/ui/patterns/DropdownChips';
import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { SPACE, SPINNER } from '@/ui/tokens/type';

const pad = (n: number) => String(n).padStart(2, '0');

export function SpinnerHeader({ at, of, onBack, onInfo }: { at: number; of: number; onBack: () => void; onInfo: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton icon="back" shape="chip" label="Back" onPress={onBack} testID="spinner-back" />
      <View
        style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: SPACE.xxs }}
        accessible
        accessibilityLabel={of === 1 ? '1 dish matches' : `${of} dishes match`}
        testID="spinner-counter"
      >
        <Text variant="counter">{pad(at)}</Text>
        <Text variant="counterSlash" colour="inkSubtle">
          /
        </Text>
        <Text variant="counterTotal" colour="inkMuted">
          {pad(of)}
        </Text>
      </View>
      <IconButton icon="info" shape="chip" label="How Surprise me works" onPress={onInfo} testID="spinner-info" />
    </View>
  );
}

const MEALS = (['dinner', 'lunch', 'breakfast', 'snack'] as const).map((m) => ({ value: m, label: MEAL_TYPE_LABELS[m] }));
const TIMES = (Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((t) => ({ value: t, label: TIME_FILTER_LABELS[t] }));
const PANTRY = [{ value: 'cupboard', label: 'From cupboard' }] as const;

export function SettingChips({ settings, onChange }: { settings: SpinSettings; onChange: (next: SpinSettings) => void }) {
  const dropdowns: Dropdown[] = [
    { key: 'meal', name: 'Meal', value: settings.meal, options: MEALS },
    { key: 'time', name: 'Time', value: settings.time, options: TIMES },
    { key: 'pantry', name: 'Pantry', value: settings.fromCupboard ? 'cupboard' : undefined, options: PANTRY },
  ];
  const choose = (key: string, value: string | undefined) => {
    if (key === 'meal') onChange({ ...settings, meal: MEALS.find((m) => m.value === value)?.value });
    if (key === 'time') onChange({ ...settings, time: TIMES.find((t) => t.value === value)?.value });
    if (key === 'pantry') onChange({ ...settings, fromCupboard: value === 'cupboard' });
  };
  return <DropdownChips dropdowns={dropdowns} onChoose={choose} testIDPrefix="spinner" />;
}

/** Editorial key and value rows: PANTRY, TIME, FOR YOU. */
export function WhyThis({ reasons }: { reasons: Reason[] }) {
  const styles = useStyles();
  return (
    <View testID="spinner-why">
      <Text variant="kickerSection" accessibilityRole="header" style={{ marginBottom: SPACE.xs }}>
        Why this
      </Text>
      {reasons.map((r, i) => (
        <View key={r.key} style={[styles.reason, i > 0 && styles.divided]}>
          <Text variant="reasonKey" style={{ width: SPINNER.reasonKeyWidth }} numberOfLines={1}>
            {r.key}
          </Text>
          <Text variant="reasonValue" colour="inkSoft" style={{ flex: 1 }} numberOfLines={2}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const HOW: { key: string; body: string }[] = [
  { key: 'Spin', body: 'Tap the card, or Spin again, and we’ll pick from the dishes that match your settings.' },
  { key: 'Settings', body: 'Meal, Time and Pantry narrow the deck. Set them to Any to spin across everything you eat.' },
  { key: 'Pantry', body: 'From cupboard keeps to dishes you can cook now, or with one or two things from the shop.' },
  { key: 'Always', body: 'Your diet and the things you avoid always apply. Planned and recently cooked dishes come up last.' },
];

export function HowItWorks({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  return (
    <ModalSheet visible={visible} onClose={onClose} title="How Surprise me works" testID="spinner-how">
      <Text variant="bodyMedium" colour="inkSoft" style={{ marginBottom: SPACE.xs }}>
        Stuck choosing? Spin and we’ll pick something you can cook tonight.
      </Text>
      {HOW.map((r, i) => (
        <View key={r.key} style={[styles.reason, styles.howRow, i > 0 && styles.divided]}>
          <Text variant="reasonKey" style={{ width: SPINNER.reasonKeyWidth }}>
            {r.key}
          </Text>
          <Text variant="reasonValue" colour="inkSoft" style={{ flex: 1 }}>
            {r.body}
          </Text>
        </View>
      ))}
      <View style={{ marginTop: SPACE.sm }}>
        <Button label="Got it" kind="primary" block onPress={onClose} testID="spinner-how-close" />
      </View>
    </ModalSheet>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  reason: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACE.sm, gap: SPACE.sm },
  howRow: { alignItems: 'flex-start' },
  divided: { borderTopWidth: 1, borderTopColor: colours.border },
}));
