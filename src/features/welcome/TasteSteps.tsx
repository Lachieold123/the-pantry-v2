// v1's taste questions, in its onboarding look: what brings you here, the
// cuisines you love, and how long you have on a weeknight with how sure you
// are in the kitchen. Answers save as they're tapped, so skipping part way
// keeps whatever was chosen. None of them hides a recipe: cuisines, time and
// skill only lift what suits (D-023), and the intents order Home's checklist.
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CUISINE_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES } from '@/domain/recipes/types';
import { INTENT_LABELS, INTENTS, SKILL_LABELS, SKILLS, type Intent } from '@/domain/welcome/onboarding';
import { usePreferences } from '@/store/preferences';
import type { IconName } from '@/ui/primitives/Icon';
import { GlassChoice, StepHeading, Wrap } from './OnVideo';

const INTENT_ICONS: Readonly<Record<Intent, IconName>> = {
  tonight: 'cook',
  plan: 'plan',
  pantry: 'basket',
  discover: 'sparkles',
  household: 'people',
};
const INTENT_SUBS: Readonly<Record<Intent, string>> = {
  tonight: 'Something good, without the thinking',
  plan: 'Dinners for the week and one shopping list',
  pantry: 'Cook from what’s already in the cupboard',
  discover: `Ideas from ${CUISINES.length} cuisines`,
  household: 'Share the plan and the list',
};

type Weeknight = TimeFilter | 'any';
const WEEKNIGHT: readonly { value: Weeknight; label: string; sub: string }[] = [
  { value: 'under-30', label: 'Quick', sub: '30 minutes or less' },
  { value: 'under-45', label: 'A bit longer', sub: 'Up to 45 minutes' },
  { value: 'any', label: 'No rush', sub: 'Happy to take my time' },
];

export function IntentStep() {
  const intents = usePreferences((s) => s.intents);
  const toggle = usePreferences((s) => s.toggleIntent);
  return (
    <View>
      <StepHeading kicker="First up" title="What brings you here?" sub="Pick any. We’ll start with what matters to you." />
      <Wrap tiles>
        {INTENTS.map((i) => (
          <GlassChoice
            key={i}
            label={INTENT_LABELS[i]}
            sub={INTENT_SUBS[i]}
            icon={INTENT_ICONS[i]}
            selected={intents.includes(i)}
            onPress={() => toggle(i)}
            testID={`intent-${i}`}
          />
        ))}
      </Wrap>
    </View>
  );
}

export function CuisineStep() {
  const cuisines = usePreferences((s) => s.cuisines);
  const toggleCuisine = usePreferences((s) => s.toggleCuisine);
  return (
    <View>
      <StepHeading kicker="Cuisines" title="What do you love eating?" sub="Pick a few, or none. We’ll show these first, not only these." />
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
    </View>
  );
}

export function TimeStep() {
  const { weeknight, skill, setWeeknight, setSkill } = usePreferences(
    useShallow(({ weeknight, skill, setWeeknight, setSkill }) => ({ weeknight, skill, setWeeknight, setSkill })),
  );
  const current: Weeknight = weeknight ?? 'any';
  return (
    <View>
      <StepHeading kicker="Weeknight time" title="How long do you have?" sub="For dinner on a weeknight." />
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
      <StepHeading kicker="Skill level" sub="We’ll lean towards recipes that suit. Nothing is hidden." />
      <Wrap tiles>
        {SKILLS.map((k) => (
          <GlassChoice
            key={k}
            label={SKILL_LABELS[k].label}
            sub={SKILL_LABELS[k].sub}
            radio
            selected={skill === k}
            // A second tap clears it, so "no answer" is always reachable.
            onPress={() => setSkill(skill === k ? undefined : k)}
            testID={`skill-${k}`}
          />
        ))}
      </Wrap>
    </View>
  );
}
