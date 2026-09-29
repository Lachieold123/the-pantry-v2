// The two quiz questions. Answers save as they're tapped, so skipping part
// way keeps whatever was chosen.
import type { ReactNode } from 'react';
import { View } from 'react-native';

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

export function EatStep() {
  const { diet, avoid, setDiet, toggleAvoidOption } = usePreferences();
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="What do you eat?" />
        <Row>
          {DIETS.map((d) => (
            <Chip key={d} label={DIET_PREFERENCE_LABELS[d]} selected={diet === d} onPress={() => setDiet(d)} />
          ))}
        </Row>
      </View>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Anything to avoid?" />
        <Row>
          {AVOIDS.map((o) => (
            <Chip key={o} label={AVOID_LABELS[o]} selected={avoid.options.includes(o)} onPress={() => toggleAvoidOption(o)} />
          ))}
        </Row>
        <Text variant="meta">We won’t suggest recipes with these. It’s a convenience, not an allergy filter.</Text>
      </View>
    </View>
  );
}

export function LikeStep() {
  const { cuisines, weeknight, toggleCuisine, setWeeknight } = usePreferences();
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="What do you love?" />
        <Text variant="meta">Pick a few, or none. We’ll show these first, not only these.</Text>
        <Row>
          {CUISINES.map((c) => (
            <Chip key={c} label={CUISINE_LABELS[c]} selected={cuisines.includes(c)} onPress={() => toggleCuisine(c)} />
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
