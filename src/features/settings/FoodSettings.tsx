// What the cook eats and avoids. Surprise me and suggestions treat these as
// hard rules. The avoid list is a convenience, not an allergy filter (D-006).
import { useState } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AVOID_OPTIONS, type DietPreference } from '@/domain/recipes/diets';
import { AVOID_LABELS, DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import { usePreferences } from '@/store/preferences';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Chip } from '@/ui/primitives/Chip';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';

const DIETS = Object.keys(DIET_PREFERENCE_LABELS) as DietPreference[];
const OPTIONS = Object.keys(AVOID_OPTIONS) as (keyof typeof AVOID_OPTIONS)[];

export function FoodSettings() {
  const { diet, avoid, setDiet, toggleAvoidOption, addAvoidWord, removeAvoidWord } = usePreferences(
    useShallow(({ diet, avoid, setDiet, toggleAvoidOption, addAvoidWord, removeAvoidWord }) => ({
      diet,
      avoid,
      setDiet,
      toggleAvoidOption,
      addAvoidWord,
      removeAvoidWord,
    })),
  );
  const [word, setWord] = useState('');
  const add = () => {
    addAvoidWord(word);
    setWord('');
  };
  return (
    <View style={{ gap: SPACE.md }}>
      <SectionHeader title="What you eat" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        {DIETS.map((d) => (
          <Chip key={d} label={DIET_PREFERENCE_LABELS[d]} selected={diet === d} onPress={() => setDiet(d)} />
        ))}
      </View>
      <SectionHeader title="Ingredients to avoid" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        {OPTIONS.map((o) => (
          <Chip key={o} label={AVOID_LABELS[o]} selected={avoid.options.includes(o)} onPress={() => toggleAvoidOption(o)} />
        ))}
        {avoid.custom.map((c) => (
          <Chip key={c} label={`${c} ×`} selected onPress={() => removeAvoidWord(c)} />
        ))}
      </View>
      <TextField
        label="Anything else"
        placeholder="Coriander"
        value={word}
        onChangeText={setWord}
        onSubmitEditing={add}
        returnKeyType="done"
        maxLength={30}
      />
      <Text variant="meta">
        Recipes using these won’t be suggested. This is a convenience, not an allergy filter: always check labels and recipes yourself.
      </Text>
    </View>
  );
}
