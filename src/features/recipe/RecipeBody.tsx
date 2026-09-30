// The ingredients, method and notes, scaled and in the cook's units, in the
// original's look (spec §4.18 items 8–10). Tapping an ingredient ticks it off
// while you gather things; ticks last only while the page is open, and only
// for this version of the recipe.
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { splitStepTimers } from '@/domain/cook/cook';
import { formatLine, scaleLine, type UnitSystem } from '@/domain/ingredients/format';
import type { IngredientLine } from '@/domain/ingredients/types';
import { substitutionFor } from '@/domain/recipes/substitutions';
import type { Recipe } from '@/domain/recipes/types';
import { capitaliseLine, IngredientGroups } from '@/ui/patterns/IngredientGroups';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, RECIPE, SPACE } from '@/ui/tokens/type';

function Heading({ children }: { children: string }) {
  return (
    <Text variant="headingSans" accessibilityRole="header">
      {children} :
    </Text>
  );
}

type IngredientsProps = { recipe: Recipe; servings: number; units: UnitSystem; have: ReadonlySet<string> };

export function Ingredients({ recipe, servings, units, have }: IngredientsProps) {
  const styles = useStyles();
  // Ticks belong to the line itself, not its position, so a line moving (or the recipe being
  // edited, which makes new lines) can't leave a different ingredient ticked (audit F50).
  const [ticked, setTicked] = useState<ReadonlySet<IngredientLine>>(new Set());
  const ratio = servings / recipe.servings;
  const tick = (line: IngredientLine) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  return (
    <View style={styles.section}>
      <Heading>Ingredients</Heading>
      <IngredientGroups
        groups={recipe.ingredientGroups}
        renderLine={(line, key) => {
          const done = ticked.has(line);
          const inCupboard = line.ingredientId !== undefined && have.has(line.ingredientId);
          const tip = substitutionFor(line.ingredientId);
          const text = capitaliseLine(formatLine(scaleLine(line, ratio), units));
          return (
            <View key={key}>
              <Pressable
                onPress={() => tick(line)}
                accessibilityRole="checkbox"
                aria-checked={done}
                accessibilityLabel={inCupboard ? `${text}, in your cupboard` : text}
                style={styles.line}
                testID={`ingredient-${key}`}
              >
                <View style={[styles.bullet, done && styles.bulletDone]} />
                <Text variant="body" colour={done ? 'inkSubtle' : 'ink'} style={[styles.lineText, done && styles.struck]}>
                  {text}
                </Text>
                {inCupboard ? (
                  <View style={styles.have}>
                    <Icon name="check" size={10} colour="bg" />
                    <Text variant="pill" colour="bg">
                      Have
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              {tip ? (
                <View style={styles.tip}>
                  <Icon name="substitute" size={12} colour="accent" />
                  <Text variant="note" colour="inkMuted" style={{ flex: 1 }}>
                    {tip}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

export function Method({ recipe }: { recipe: Recipe }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Heading>Directions</Heading>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${step.text}`}>
          <Text variant="stepNumber" align="center" style={styles.stepNumber}>
            {i + 1}
          </Text>
          <View style={styles.stepRule} />
          <Text variant="body" colour="inkSoft" style={styles.stepText}>
            {splitStepTimers(step.text).map((seg, si) =>
              seg.type === 'text' ? (
                seg.text
              ) : (
                // Times read as chips here; in Cook Mode they become tap-to-start timers.
                <Text key={si} variant="bodyMedium" colour="accentDeep" style={styles.timer}>
                  {` ${seg.label} `}
                </Text>
              ),
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Notes({ notes }: { notes: readonly string[] }) {
  const styles = useStyles();
  if (notes.length === 0) return null;
  return (
    <View style={styles.section}>
      <Heading>Notes</Heading>
      <View style={styles.notes}>
        {notes.map((n, i) => (
          <View key={i} style={styles.note}>
            <Text variant="body" colour="accent">
              ·
            </Text>
            <Text variant="bodyMedium" colour="inkSoft" style={{ flex: 1 }}>
              {n}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  section: { gap: SPACE.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: 7, minHeight: 36 },
  bullet: { width: RECIPE.bullet, height: RECIPE.bullet, borderRadius: RECIPE.bullet, backgroundColor: colours.bullet },
  bulletDone: { backgroundColor: colours.accent },
  lineText: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  have: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 5,
    paddingRight: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  tip: { flexDirection: 'row', gap: SPACE.xs, marginLeft: RECIPE.bullet + SPACE.sm, marginTop: -2, marginBottom: 6 },
  step: { flexDirection: 'row', gap: SPACE.md - 2, marginBottom: SPACE.xs, paddingLeft: 2 },
  stepNumber: { width: RECIPE.stepNumber },
  stepRule: { width: RECIPE.stepRule, borderRadius: 1, backgroundColor: colours.accent, marginRight: SPACE.xxs },
  stepText: { flex: 1 },
  timer: { fontWeight: '700', backgroundColor: colours.accentSoft },
  notes: { backgroundColor: colours.bgSoft, borderRadius: RADIUS.big, padding: SPACE.md, gap: 6 },
  note: { flexDirection: 'row', gap: SPACE.sm - 2 },
}));
