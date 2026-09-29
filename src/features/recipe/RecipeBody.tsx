// The ingredients and method, scaled and in the cook's units.
import { View } from 'react-native';

import { splitStepTimers } from '@/domain/cook/cook';
import { formatLine, scaleLine, type UnitSystem } from '@/domain/ingredients/format';
import { substitutionFor } from '@/domain/recipes/substitutions';
import type { Recipe } from '@/domain/recipes/types';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Divider } from '@/ui/primitives/Divider';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

export function Ingredients({ recipe, servings, units }: { recipe: Recipe; servings: number; units: UnitSystem }) {
  const ratio = servings / recipe.servings;
  return (
    <View style={{ gap: SPACE.md }}>
      {recipe.ingredientGroups.map((group, gi) => (
        <View key={gi} style={{ gap: SPACE.xxs }}>
          {group.title ? <Text variant="kicker">{group.title}</Text> : null}
          {group.items.map((line, li) => {
            const tip = substitutionFor(line.ingredientId);
            return (
              <View key={li}>
                <View style={{ paddingVertical: SPACE.xs, gap: 2 }}>
                  <Text variant="body">{capitalise(formatLine(scaleLine(line, ratio), units))}</Text>
                  {tip ? <Text variant="meta">{tip}</Text> : null}
                </View>
                <Divider />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function Method({ recipe }: { recipe: Recipe }) {
  return (
    <View style={{ gap: SPACE.lg }}>
      <SectionHeader title="Method" />
      {recipe.steps.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: SPACE.sm }} accessible accessibilityLabel={`Step ${i + 1}. ${step.text}`}>
          <Text variant="numeral" style={{ width: 28 }}>
            {i + 1}
          </Text>
          <Text variant="body" style={{ flex: 1 }}>
            {splitStepTimers(step.text).map((seg, si) =>
              seg.type === 'text' ? (
                seg.text
              ) : (
                // Times are highlighted here; they become tap-to-start timers in Cook Mode (Phase 6).
                <Text key={si} variant="body" colour="accent">
                  {seg.label}
                </Text>
              ),
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
