// The ingredients, method and notes, scaled and in the cook's units, in the
// original's look (spec §4.18 items 8–10). Tapping an ingredient ticks it off
// while you gather things; ticks last only while the page is open.
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { splitStepTimers } from '@/domain/cook/cook';
import { formatLine, scaleLine, type UnitSystem } from '@/domain/ingredients/format';
import { substitutionFor } from '@/domain/recipes/substitutions';
import type { Recipe } from '@/domain/recipes/types';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRESSED, RADIUS, RECIPE, SPACE, TAP_TARGET } from '@/ui/tokens/type';

function Heading({ children }: { children: string }) {
  return (
    // v1's spaced colon is kept on screen; VoiceOver hears just the word.
    <Text variant="headingSans" accessibilityRole="header" accessibilityLabel={children}>
      {children} :
    </Text>
  );
}

type IngredientsProps = {
  recipe: Recipe;
  servings: number;
  units: UnitSystem;
  have: ReadonlySet<string>;
  /** Opens "Add to list" (D-037). */
  onAddToList: () => void;
};

export function Ingredients({ recipe, servings, units, have, onAddToList }: IngredientsProps) {
  const styles = useStyles();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const ratio = servings / recipe.servings;
  const tick = (key: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <View style={styles.section}>
      <View style={styles.headRow}>
        <Heading>Ingredients</Heading>
        <Pressable
          onPress={onAddToList}
          accessibilityRole="button"
          accessibilityLabel="Add ingredients to your shopping list"
          testID="recipe-add-to-list"
          style={({ pressed }) => [styles.addToList, pressed && { opacity: PRESSED.row }]}
        >
          <Icon name="basket" size={RECIPE.addIcon} colour="accentText" />
          <Text variant="label" colour="accentText">
            Add to list
          </Text>
        </Pressable>
      </View>
      {recipe.ingredientGroups.map((group, gi) => (
        <View key={gi}>
          {group.title ? (
            <Text variant="kickerSection" style={styles.groupTitle} accessibilityRole="header">
              {group.title}
            </Text>
          ) : null}
          {group.items.map((line, li) => {
            const key = `${gi}-${li}`;
            const done = ticked.has(key);
            const inCupboard = line.ingredientId !== undefined && have.has(line.ingredientId);
            const tip = substitutionFor(line.ingredientId);
            const text = capitalise(formatLine(scaleLine(line, ratio), units));
            return (
              <View key={key}>
                <Pressable
                  onPress={() => tick(key)}
                  accessibilityRole="checkbox"
                  aria-checked={done}
                  accessibilityLabel={inCupboard ? `${text}, in your cupboard` : text}
                  style={styles.line}
                  testID={`ingredient-${key}`}
                >
                  <View style={[styles.bullet, done && styles.bulletDone]} />
                  <Text variant="body" colour={done ? 'inkMuted' : 'ink'} style={[styles.lineText, done && styles.struck]}>
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
                    <Icon name="substitute" size={12} colour="accentText" />
                    <Text variant="note" colour="inkMuted" style={{ flex: 1 }}>
                      {tip}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
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
            <Text variant="body" colour="accentText">
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

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const useStyles = makeStyles(({ colours }) => ({
  section: { gap: SPACE.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  addToList: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs, minHeight: TAP_TARGET, paddingLeft: SPACE.sm },
  groupTitle: { marginTop: SPACE.sm, marginBottom: SPACE.xxs },
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
