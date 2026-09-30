// The two quiz questions. Answers save as they're tapped, so skipping part
// way keeps whatever was chosen.
import type { ReactNode, Ref } from 'react';
import { View, type Text as RNText } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AVOID_OPTIONS, type AvoidOption, type DietPreference } from '@/domain/recipes/diets';
import { AVOID_LABELS, CUISINE_LABELS, DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES } from '@/domain/recipes/types';
import { usePreferences } from '@/store/preferences';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Chip } from '@/ui/primitives/Chip';
import { Segmented } from '@/ui/primitives/Segmented';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const DIETS = Object.keys(DIET_PREFERENCE_LABELS) as DietPreference[];
const AVOIDS = Object.keys(AVOID_OPTIONS) as AvoidOption[];
type Weeknight = TimeFilter | 'any';
const WEEKNIGHT = [
  { value: 'under-30', label: '30 min' },
  { value: 'under-45', label: '45 min' },
  { value: 'any', label: 'No rush' },
] as const;

function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{children}</View>;
}

/** `headingRef` lets the Welcome screen move VoiceOver to the new question. */
export function EatStep({ headingRef }: { headingRef?: Ref<RNText> }) {
  const { diet, avoid, setDiet, toggleAvoidOption } = usePreferences(
    useShallow(({ diet, avoid, setDiet, toggleAvoidOption }) => ({ diet, avoid, setDiet, toggleAvoidOption })),
  );
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="What do you eat?" titleRef={headingRef} />
        <Row>
          {DIETS.map((d) => (
            <Chip
              key={d}
              role="radio"
              label={DIET_PREFERENCE_LABELS[d]}
              selected={diet === d}
              onPress={() => setDiet(d)}
              testID={`diet-${d}`}
            />
          ))}
        </Row>
      </View>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Anything to avoid?" />
        <Row>
          {AVOIDS.map((o) => (
            <Chip
              key={o}
              label={AVOID_LABELS[o]}
              selected={avoid.options.includes(o)}
              onPress={() => toggleAvoidOption(o)}
              testID={`avoid-${o}`}
            />
          ))}
        </Row>
        <Text variant="meta">We won’t suggest recipes with these. It’s a convenience, not an allergy filter.</Text>
      </View>
    </View>
  );
}

export function LikeStep({ headingRef }: { headingRef?: Ref<RNText> }) {
  const { cuisines, weeknight, toggleCuisine, setWeeknight } = usePreferences(
    useShallow(({ cuisines, weeknight, toggleCuisine, setWeeknight }) => ({ cuisines, weeknight, toggleCuisine, setWeeknight })),
  );
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="What do you love?" titleRef={headingRef} />
        <Text variant="meta">Pick a few, or none. We’ll show these first, not only these.</Text>
        <Row>
          {CUISINES.map((c) => (
            <Chip
              key={c}
              label={CUISINE_LABELS[c]}
              selected={cuisines.includes(c)}
              onPress={() => toggleCuisine(c)}
              testID={`cuisine-${c}`}
            />
          ))}
        </Row>
      </View>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Time for a weeknight dinner" />
        <Segmented<Weeknight>
          label="Weeknight time"
          options={WEEKNIGHT}
          value={weeknight ?? 'any'}
          onChange={(v) => setWeeknight(v === 'any' ? undefined : v)}
        />
      </View>
    </View>
  );
}
