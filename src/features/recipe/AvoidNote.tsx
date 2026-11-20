// The avoid list on the recipe page (F-3). Browse and Surprise already hide
// what the avoid list catches, but a recipe can still be opened from a link,
// a bookmark or a household member, and typed recipes can hold words the
// ingredient database doesn't know. People with allergies rely on this, so we
// say plainly what we couldn't check instead of implying it's safe.
import { View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { avoidNotice } from '@/domain/recipes/diets';
import type { Recipe } from '@/domain/recipes/types';
import { usePreferences } from '@/store/preferences';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { ICON, RADIUS, SPACE } from '@/ui/tokens/type';

export function AvoidNote({ recipe }: { recipe: Pick<Recipe, 'ingredientGroups'> }) {
  const styles = useStyles();
  const avoid = usePreferences((s) => s.avoid);
  const notice = avoidNotice(recipe, avoid, INGREDIENTS);
  if (!notice) return null;
  const n = notice.unchecked.length;
  return (
    <View style={styles.box} testID="avoid-note" accessibilityRole="alert">
      <Icon name="info" size={ICON.hint} colour="accentText" />
      <View style={styles.words}>
        {notice.avoided ? (
          <Text variant="note" colour="ink">
            This recipe has something on your avoid list.
          </Text>
        ) : null}
        {n > 0 ? (
          <Text variant="note" colour="ink">
            {`We couldn't check ${n === 1 ? '1 ingredient' : `${n} ingredients`} against your avoid list: ${notice.unchecked.join(', ')}. Check the labels before you cook.`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  box: { flexDirection: 'row', gap: SPACE.xs, padding: SPACE.sm, borderRadius: RADIUS.big, backgroundColor: colours.accentSoft },
  words: { flex: 1, gap: SPACE.xxs },
}));
