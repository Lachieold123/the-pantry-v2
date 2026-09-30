// The quick-pick facts about a recipe: cuisine, meal, effort, time and size.
import { View } from 'react-native';

import type { RecipeDraft } from '@/domain/recipes/draft';
import { CUISINE_LABELS, MEAL_TYPE_LABELS } from '@/domain/recipes/labels';
import { CUISINES, MEAL_TYPES, type Difficulty } from '@/domain/recipes/types';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Chip } from '@/ui/primitives/Chip';
import { Segmented } from '@/ui/primitives/Segmented';
import { Stepper } from '@/ui/primitives/Stepper';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';

const DIFFICULTY = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

const MAX_MINUTES = 24 * 60 * 3;

/** Whole minutes from what was typed; anything else counts as zero rather than blocking the form. */
function minutesFrom(text: string): number {
  const n = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? Math.min(n, MAX_MINUTES) : 0;
}

type Props = {
  draft: RecipeDraft;
  update: <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => void;
  cuisineProblem: string | undefined;
  mealProblem: string | undefined;
};

export function EditorDetails({ draft, update, cuisineProblem, mealProblem }: Props) {
  const toggleMeal = (m: (typeof MEAL_TYPES)[number]) =>
    update('mealTypes', draft.mealTypes.includes(m) ? draft.mealTypes.filter((x) => x !== m) : [...draft.mealTypes, m]);

  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Cuisine" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          {CUISINES.map((c) => (
            <Chip
              key={c}
              label={CUISINE_LABELS[c]}
              selected={draft.cuisine === c}
              onPress={() => update('cuisine', c)}
              testID={`editor-cuisine-${c}`}
            />
          ))}
        </View>
        {cuisineProblem ? (
          <Text variant="meta" colour="danger">
            {cuisineProblem}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Good for" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          {MEAL_TYPES.map((m) => (
            <Chip
              key={m}
              label={MEAL_TYPE_LABELS[m]}
              selected={draft.mealTypes.includes(m)}
              onPress={() => toggleMeal(m)}
              testID={`editor-meal-${m}`}
            />
          ))}
        </View>
        {mealProblem ? (
          <Text variant="meta" colour="danger">
            {mealProblem}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Effort and time" />
        <Segmented<Difficulty> label="Difficulty" options={DIFFICULTY} value={draft.difficulty} onChange={(d) => update('difficulty', d)} />
        <View style={{ flexDirection: 'row', gap: SPACE.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Prep minutes"
              keyboardType="number-pad"
              value={String(draft.prepMinutes)}
              onChangeText={(t) => update('prepMinutes', minutesFrom(t))}
              maxLength={4}
              selectTextOnFocus
              testID="editor-prep"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Cook minutes"
              keyboardType="number-pad"
              value={String(draft.cookMinutes)}
              onChangeText={(t) => update('cookMinutes', minutesFrom(t))}
              maxLength={4}
              selectTextOnFocus
              testID="editor-cook"
            />
          </View>
        </View>
        <Stepper
          label="Serves"
          value={draft.servings}
          onChange={(n) => update('servings', n)}
          format={(n) => `Serves ${n}`}
          testID="editor-servings"
        />
        <Switch label="One pot or pan" value={draft.onePot} onChange={(v) => update('onePot', v)} testID="editor-one-pot" />
      </View>
    </View>
  );
}
