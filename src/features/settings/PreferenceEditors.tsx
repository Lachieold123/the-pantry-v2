// One editor per cooking preference, shown in a small sheet from Settings (v1's
// PreferenceEditorSheet). Choices save as they're tapped, like the rest of v2's
// settings, so there's no Save/Cancel to forget. The avoid list is a
// convenience, not an allergy filter (D-006).
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { AVOID_OPTIONS, avoidMatches, type AvoidOption, type DietPreference } from '@/domain/recipes/diets';
import { AVOID_LABELS, CUISINE_LABELS, DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import type { TimeFilter } from '@/domain/recipes/search';
import { CUISINES } from '@/domain/recipes/types';
import { usePreferences } from '@/store/preferences';
import { useAllRecipes } from '@/store/recipeBook';
import { Chip } from '@/ui/primitives/Chip';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';

export type CookingPreference = 'diet' | 'avoid' | 'cuisines' | 'weeknight';

const DIETS = Object.keys(DIET_PREFERENCE_LABELS) as DietPreference[];
const AVOIDS = Object.keys(AVOID_OPTIONS) as AvoidOption[];
/** v2 stores "no rush" as no limit; the sheet needs a key for it. */
type Weeknight = TimeFilter | 'any';
export const WEEKNIGHT_LABELS: Partial<Record<Weeknight, string>> = { 'under-30': '≤ 30 min', 'under-45': '≤ 45 min', any: 'No rush' };
const WEEKNIGHTS = Object.keys(WEEKNIGHT_LABELS) as Weeknight[];

function Wrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{children}</View>;
}

function DietEditor() {
  const diet = usePreferences((s) => s.diet);
  const setDiet = usePreferences((s) => s.setDiet);
  return (
    <Wrap>
      {DIETS.map((d) => (
        <Chip
          key={d}
          label={DIET_PREFERENCE_LABELS[d]}
          role="radio"
          selected={diet === d}
          onPress={() => setDiet(d)}
          testID={`settings-diet-${d}`}
        />
      ))}
    </Wrap>
  );
}

function AvoidEditor() {
  const { avoid, toggleAvoidOption, addAvoidWord, removeAvoidWord } = usePreferences(
    useShallow(({ avoid, toggleAvoidOption, addAvoidWord, removeAvoidWord }) => ({
      avoid,
      toggleAvoidOption,
      addAvoidWord,
      removeAvoidWord,
    })),
  );
  const recipes = useAllRecipes();
  // A word can reach further than expected ("peppers" includes black pepper), so say how far before it surprises anyone (F136).
  const reach = useMemo(
    () =>
      avoid.custom.map((c) => {
        const n = avoidMatches(c, recipes, INGREDIENTS);
        return `“${c}” hides ${n} ${n === 1 ? 'recipe' : 'recipes'}.`;
      }),
    [avoid.custom, recipes],
  );
  const [word, setWord] = useState('');
  const add = () => {
    addAvoidWord(word);
    setWord('');
  };
  return (
    <View style={{ gap: SPACE.md }}>
      <Wrap>
        {AVOIDS.map((o) => (
          <Chip
            key={o}
            label={AVOID_LABELS[o]}
            selected={avoid.options.includes(o)}
            onPress={() => toggleAvoidOption(o)}
            testID={`settings-avoid-${o}`}
          />
        ))}
        {avoid.custom.map((c) => (
          <Chip
            key={c}
            role="button"
            label={`${c} ×`}
            accessibilityLabel={`Remove ${c}`}
            selected
            onPress={() => removeAvoidWord(c)}
            testID={`settings-avoid-custom-${c}`}
          />
        ))}
      </Wrap>
      {reach.length ? (
        <Text variant="meta" colour="inkSoft" testID="settings-avoid-reach">
          {reach.join(' ')}
        </Text>
      ) : null}
      <TextField
        label="Anything else"
        placeholder="Coriander"
        value={word}
        onChangeText={setWord}
        onSubmitEditing={add}
        returnKeyType="done"
        maxLength={30}
        testID="settings-avoid-word"
      />
      <Text variant="caption">
        Recipes using these won’t be suggested. This is a convenience, not an allergy filter: always check labels and recipes yourself.
      </Text>
    </View>
  );
}

function CuisinesEditor() {
  const cuisines = usePreferences((s) => s.cuisines);
  const toggleCuisine = usePreferences((s) => s.toggleCuisine);
  return (
    <View style={{ gap: SPACE.sm }}>
      <Text variant="caption">Pick a few, or none. We’ll show these first, not only these.</Text>
      <Wrap>
        {CUISINES.map((c) => (
          <Chip
            key={c}
            label={CUISINE_LABELS[c]}
            selected={cuisines.includes(c)}
            onPress={() => toggleCuisine(c)}
            testID={`settings-cuisine-${c}`}
          />
        ))}
      </Wrap>
    </View>
  );
}

function WeeknightEditor() {
  const weeknight = usePreferences((s) => s.weeknight);
  const setWeeknight = usePreferences((s) => s.setWeeknight);
  const current: Weeknight = weeknight ?? 'any';
  return (
    <Wrap>
      {WEEKNIGHTS.map((w) => (
        <Chip
          key={w}
          label={WEEKNIGHT_LABELS[w] ?? w}
          role="radio"
          selected={current === w}
          onPress={() => setWeeknight(w === 'any' ? undefined : w)}
          testID={`settings-weeknight-${w}`}
        />
      ))}
    </Wrap>
  );
}

export const EDITOR_TITLES: Record<CookingPreference, string> = {
  diet: 'Diet',
  avoid: 'Things to avoid',
  cuisines: 'Cuisines you love',
  weeknight: 'Weeknight time',
};

export function PreferenceEditor({ section }: { section: CookingPreference }) {
  if (section === 'diet') return <DietEditor />;
  if (section === 'avoid') return <AvoidEditor />;
  if (section === 'cuisines') return <CuisinesEditor />;
  return <WeeknightEditor />;
}
