// A recipe's ingredients under their group headings ("Mash", "Gravy"). Shared
// by the recipe page and Cook Mode, so both show the headings: without them
// "50 g butter" and "80 g butter" can't be told apart at the stove (audit F169).
// Each screen draws its own lines; this owns the grouping and the headings.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { IngredientLine } from '@/domain/ingredients/types';
import type { IngredientGroupBlock } from '@/domain/recipes/types';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { SPACE } from '@/ui/tokens/type';

type Props = {
  groups: readonly IngredientGroupBlock[];
  /** `key` is stable for the line's place in the recipe, for React keys and test ids. */
  renderLine: (line: IngredientLine, key: string) => ReactNode;
  /** Space between lines within a group. */
  gap?: number;
};

export function IngredientGroups({ groups, renderLine, gap = 0 }: Props) {
  const styles = useStyles();
  return (
    <>
      {groups.map((group, gi) => (
        <View key={gi} style={{ gap }} testID={`ingredient-group-${gi}`}>
          {group.title ? (
            <Text variant="kickerSection" style={styles.groupTitle} accessibilityRole="header">
              {group.title}
            </Text>
          ) : null}
          {group.items.map((line, li) => renderLine(line, `${gi}-${li}`))}
        </View>
      ))}
    </>
  );
}

/** "brown onion" → "Brown onion": lines read as a list, not mid-sentence. */
export function capitaliseLine(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const useStyles = makeStyles(() => ({
  groupTitle: { marginTop: SPACE.sm, marginBottom: SPACE.xxs },
}));
