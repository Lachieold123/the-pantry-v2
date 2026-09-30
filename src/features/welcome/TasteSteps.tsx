// The two quiz questions, in v1's onboarding look (frosted tiles and chips on
// the dark photo). Answers save as they're tapped, so skipping part way keeps
// whatever was chosen.
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AVOID_OPTIONS, type AvoidOption, type DietPreference } from '@/domain/recipes/diets';
import { AVOID_LABELS, CUISINE_LABELS, DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES } from '@/domain/recipes/types';
import { usePreferences } from '@/store/preferences';
import { Text } from '@/ui/primitives/Text';
import { FIXED } from '@/ui/tokens/colour';
import { SPACE } from '@/ui/tokens/type';
import { GlassChoice, StepHeading, Wrap } from './OnVideo';

const DIETS = Object.keys(DIET_PREFERENCE_LABELS) as DietPreference[];
const DIET_SUBS: Record<DietPreference, string> = {
  everything: 'A bit of everything',
  vegetarian: 'No meat or seafood',
  vegan: 'No animal products',
  pescatarian: 'Seafood and veg, no meat',
};
const AVOIDS = Object.keys(AVOID_OPTIONS) as AvoidOption[];
type Weeknight = TimeFilter | 'any';
const WEEKNIGHT: readonly { value: Weeknight; label: string; sub: string }[] = [
  { value: 'under-30', label: 'Quick', sub: '30 minutes or less' },
  { value: 'under-45', label: 'A bit longer', sub: 'Up to 45 minutes' },
  { value: 'any', label: 'No rush', sub: 'Happy to take my time' },
];

export function EatStep() {
  const { diet, avoid, setDiet, toggleAvoidOption } = usePreferences(
    useShallow(({ diet, avoid, setDiet, toggleAvoidOption }) => ({ diet, avoid, setDiet, toggleAvoidOption })),
  );
  return (
    <View>
      <StepHeading kicker="Eating style" title="What do you eat?" />
      <Wrap tiles>
        {DIETS.map((d) => (
          <GlassChoice
            key={d}
            label={DIET_PREFERENCE_LABELS[d]}
            sub={DIET_SUBS[d]}
            radio
            selected={diet === d}
            onPress={() => setDiet(d)}
            testID={`diet-${d}`}
          />
        ))}
      </Wrap>
      <StepHeading kicker="Anything to avoid?" sub="Dislikes, or things you don’t eat." />
      <Wrap>
        {AVOIDS.map((o) => (
          <GlassChoice
            key={o}
            label={AVOID_LABELS[o]}
            selected={avoid.options.includes(o)}
            onPress={() => toggleAvoidOption(o)}
            testID={`avoid-${o}`}
          />
        ))}
      </Wrap>
      {/* D-006: the avoid list steers suggestions; it is never a promise about allergens. */}
      <Text variant="caption" tone={FIXED.videoSub} style={{ marginTop: SPACE.sm }}>
        We won’t suggest recipes with these. It’s a convenience, not an allergy filter.
      </Text>
    </View>
  );
}

export function LikeStep() {
  const { cuisines, weeknight, toggleCuisine, setWeeknight } = usePreferences(
    useShallow(({ cuisines, weeknight, toggleCuisine, setWeeknight }) => ({ cuisines, weeknight, toggleCuisine, setWeeknight })),
  );
  const current: Weeknight = weeknight ?? 'any';
  return (
    <View>
      <StepHeading kicker="Cuisines" title="What do you love?" sub="Pick a few, or none. We’ll show these first, not only these." />
      <Wrap>
        {CUISINES.map((c) => (
          <GlassChoice
            key={c}
            label={CUISINE_LABELS[c]}
            selected={cuisines.includes(c)}
            onPress={() => toggleCuisine(c)}
            testID={`cuisine-${c}`}
          />
        ))}
      </Wrap>
      <StepHeading kicker="Weeknight time" sub="How long do you have for dinner on a weeknight?" />
      <Wrap tiles>
        {WEEKNIGHT.map((w) => (
          <GlassChoice
            key={w.value}
            label={w.label}
            sub={w.sub}
            radio
            selected={current === w.value}
            onPress={() => setWeeknight(w.value === 'any' ? undefined : w.value)}
            testID={`weeknight-${w.value}`}
          />
        ))}
      </Wrap>
    </View>
  );
}
