// The spinner's supporting pieces (spec §7): the header with the deck
// counter, the setting chips and their pickers, "Why this", and the sheet
// that explains how it works.
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { MEAL_TYPE_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import type { MealType } from '@/domain/recipes/types';
import type { Reason, SpinSettings } from '@/domain/suggestions/spinner';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Icon } from '@/ui/primitives/Icon';
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

type Option<T extends string> = { value: T; label: string };
const MEALS: Option<MealType>[] = (['dinner', 'lunch', 'breakfast', 'snack'] as const).map((m) => ({
  value: m,
  label: MEAL_TYPE_LABELS[m],
}));
const TIMES: Option<TimeFilter>[] = [
  { value: 'under-15', label: '≤ 15 min' },
  { value: 'under-30', label: '≤ 30 min' },
  { value: 'under-45', label: '≤ 45 min' },
  { value: 'under-60', label: '≤ 1 hr' },
  { value: 'over-60', label: 'Over 1 hr' },
];
const PANTRY: Option<'cupboard'>[] = [{ value: 'cupboard', label: 'From cupboard' }];
type Picker = 'meal' | 'time' | 'pantry';

export function SettingChips({ settings, onChange }: { settings: SpinSettings; onChange: (next: SpinSettings) => void }) {
  const [open, setOpen] = useState<Picker | undefined>();
  const chips: { key: Picker; name: string; value: string | undefined; options: Option<string>[] }[] = [
    { key: 'meal', name: 'Meal', value: settings.meal, options: MEALS },
    { key: 'time', name: 'Time', value: settings.time, options: TIMES },
    { key: 'pantry', name: 'Pantry', value: settings.fromCupboard ? 'cupboard' : undefined, options: PANTRY },
  ];
  const choose = (key: Picker, value: string | undefined) => {
    setOpen(undefined);
    if (key === 'meal') onChange({ ...settings, meal: MEALS.find((m) => m.value === value)?.value });
    if (key === 'time') onChange({ ...settings, time: TIMES.find((t) => t.value === value)?.value });
    if (key === 'pantry') onChange({ ...settings, fromCupboard: value === 'cupboard' });
  };
  const picking = chips.find((c) => c.key === open);
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACE.gutter }}
        contentContainerStyle={{ gap: SPACE.xs, paddingHorizontal: SPACE.gutter }}
      >
        {chips.map((c) => (
          <Chip
            key={c.key}
            kind="dropdown"
            label={c.options.find((o) => o.value === c.value)?.label ?? c.name}
            selected={c.value !== undefined}
            onPress={() => setOpen(c.key)}
            testID={`spinner-${c.key}`}
          />
        ))}
      </ScrollView>
      <ModalSheet visible={picking !== undefined} onClose={() => setOpen(undefined)} title={picking?.name ?? ''}>
        {picking
          ? [{ value: undefined, label: 'Any' }, ...picking.options].map((o) => (
              <OptionRow
                key={o.label}
                label={o.label}
                on={picking.value === o.value}
                onPress={() => choose(picking.key, o.value)}
                testID={`spinner-option-${o.value ?? 'any'}`}
              />
            ))
          : null}
      </ModalSheet>
    </>
  );
}

function OptionRow({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID: string }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      testID={testID}
      style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}
    >
      <Text variant="row" style={{ flex: 1 }}>
        {label}
      </Text>
      {on ? <Icon name="check" size={18} /> : null}
    </Pressable>
  );
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

type EmptyProps = {
  because: 'no-recipes' | 'taste' | 'settings';
  fromCupboard: boolean;
  onAnything: () => void;
  onSettings: () => void;
  onAddRecipe: () => void;
};

/** An empty deck names its real cause and offers the one thing that fixes it (audit F31). */
export function SpinnerEmpty({ because, fromCupboard, onAnything, onSettings, onAddRecipe }: EmptyProps) {
  if (because === 'no-recipes') {
    return (
      <EmptyState
        title="No recipes to spin yet"
        body="House recipes appear once they’ve been cooked and checked in The Pantry kitchen. Your own recipes count too."
        action={{ label: 'Add a recipe', onPress: onAddRecipe }}
        testID="spinner-empty"
      />
    );
  }
  if (because === 'taste') {
    return (
      <EmptyState
        title="Nothing fits what you eat"
        body="Your diet, the things you avoid and the dishes marked Not for us rule out every recipe we have."
        action={{ label: 'Open Settings', onPress: onSettings }}
        testID="spinner-empty"
      />
    );
  }
  return (
    <EmptyState
      title="No dishes match"
      body={
        fromCupboard
          ? 'Nothing fits with what’s in your cupboard. Loosen a setting above, or add a few things to the cupboard.'
          : 'Nothing fits this meal and time. Loosen a setting above, or spin across everything.'
      }
      action={{ label: 'Spin across everything', onPress: onAnything }}
      testID="spinner-empty"
    />
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
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: SPACE.xs },
  reason: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACE.sm, gap: SPACE.sm },
  howRow: { alignItems: 'flex-start' },
  divided: { borderTopWidth: 1, borderTopColor: colours.border },
}));
