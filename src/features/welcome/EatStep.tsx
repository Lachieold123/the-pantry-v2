// Step 1 of 2: "Anything you don't eat?" The diet and the avoid list on one
// short screen, in v1's onboarding look (frosted chips on the dark photo).
// Answers save as they're tapped, so skipping part way keeps whatever was
// chosen, and nothing here is required: "Everything" starts ticked.
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AVOID_OPTIONS, type AvoidOption, type DietPreference } from '@/domain/recipes/diets';
import { AVOID_LABELS, DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import { usePreferences } from '@/store/preferences';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { SPACE } from '@/ui/tokens/type';
import { GlassChoice, StepHeading, Wrap } from './OnVideo';

const DIETS = Object.keys(DIET_PREFERENCE_LABELS) as DietPreference[];
const AVOIDS = Object.keys(AVOID_OPTIONS) as AvoidOption[];

/** True when nothing is ruled out, so the footer can say "None of these" instead of "Continue". */
export function useEatsEverything(): boolean {
  return usePreferences((s) => s.diet === 'everything' && s.avoid.options.length === 0 && s.avoid.custom.length === 0);
}

export function EatStep() {
  const styles = useStyles();
  const { diet, avoid, setDiet, toggleAvoidOption } = usePreferences(
    useShallow(({ diet, avoid, setDiet, toggleAvoidOption }) => ({ diet, avoid, setDiet, toggleAvoidOption })),
  );
  return (
    <View>
      <StepHeading kicker="Step 1 of 2" title="Anything you don’t eat?" sub="Tap any that apply. If none do, carry on." />
      <StepHeading kicker="I eat" />
      <Wrap>
        {DIETS.map((d) => (
          <GlassChoice
            key={d}
            label={DIET_PREFERENCE_LABELS[d]}
            radio
            selected={diet === d}
            onPress={() => setDiet(d)}
            testID={`diet-${d}`}
          />
        ))}
      </Wrap>
      <StepHeading kicker="Leave out" />
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
      <Text variant="caption" tone={FIXED.videoSub} style={styles.note}>
        We won’t suggest recipes with these. It’s a convenience, not an allergy filter.
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  note: { marginTop: SPACE.sm },
}));
