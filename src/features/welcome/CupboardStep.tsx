// Step 2 of 2: "What's in your cupboard?" What I have is the point of the app
// (D-034), so the welcome ends by filling the cupboard with a few taps rather
// than asking about cuisines; those are learnt or set later in Settings.
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { cupboardIds } from '@/domain/cupboard/match';
import { NO_FILTERS } from '@/domain/recipes/search';
import { capitalise } from '@/domain/shopping/derive';
import { eligibleForSurprise } from '@/domain/suggestions/surprise';
import { welcomeCupboardPicks } from '@/domain/welcome/cupboardPicks';
import { ingredientName } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { usePreferences } from '@/store/preferences';
import { useAllRecipes } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME } from '@/ui/tokens/screens';
import { GlassChoice, StepHeading, TextButton, Wrap } from './OnVideo';

/**
 * What to offer, from the recipes this cook can eat (step 1's answers apply).
 * What's already in the cupboard is read once, when the welcome opens, so the
 * grid doesn't reshuffle under a finger and a redo only offers new things.
 */
export function useCupboardPicks(): string[] {
  const [have] = useState(() => cupboardIds(useCupboard.getState().items));
  const recipes = useAllRecipes();
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  return useMemo(() => {
    const eats = eligibleForSurprise({ recipes, filters: NO_FILTERS, diet, avoid, hidden: new Set(hidden), index: INGREDIENTS });
    return welcomeCupboardPicks(eats, have, INGREDIENTS, KITCHEN);
  }, [recipes, diet, avoid, hidden, have]);
}

type Props = {
  picks: readonly string[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSkip: () => void;
};

export function CupboardStep({ picks, picked, onToggle, onSkip }: Props) {
  const styles = useStyles();
  return (
    <View>
      <StepHeading
        kicker="Step 2 of 2"
        title="What’s in your cupboard?"
        sub="Tap what you have right now. You can change it any time in the Cupboard tab."
      />
      {picks.length ? (
        <Wrap>
          {picks.map((id) => (
            <GlassChoice
              key={id}
              label={capitalise(ingredientName(id))}
              selected={picked.has(id)}
              onPress={() => onToggle(id)}
              testID={`welcome-cupboard-${id}`}
            />
          ))}
        </Wrap>
      ) : (
        // Only after a redo, when the cupboard already holds everything we'd offer.
        <Text variant="lead" tone={FIXED.videoSoft} testID="welcome-cupboard-empty">
          Your cupboard already has the everyday things. Add anything else in the Cupboard tab.
        </Text>
      )}
      <View style={styles.skip}>
        <TextButton label="Skip for now" onPress={onSkip} testID="welcome-cupboard-skip" />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  skip: { alignItems: 'center', marginTop: WELCOME.sectionTop },
}));
