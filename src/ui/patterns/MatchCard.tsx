// The ink "you can cook this" card on the Cupboard rail (spec §4.6, v1's match
// card). The pill says Ready or Need 1 instead of v1's percentage, and the meta
// line names what's missing, so the card answers "can I cook this tonight?".
import { Pressable, View } from 'react-native';

import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { makeStyles } from '@/ui/theme/makeStyles';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
import { CARD, JAR, PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';
import { RecipeImage } from './RecipeImage';

type Props = { recipe: Recipe; image: number | undefined; ready: boolean; need: string; onPress: () => void; testID: string };

export function MatchCard({ recipe, image, ready, need, onPress, testID }: Props) {
  const styles = useStyles();
  // The card is ink-filled, so its ground is the opposite of the theme's.
  const ground = useTheme().name === 'light' ? 'dark' : 'light';
  const pill = ready ? 'Ready' : (need.split(':')[0] ?? need);
  const meta = `${formatMinutes(totalMinutes(recipe))} · ${ready ? 'Nothing to buy' : need}`;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}. ${ready ? 'Ready to cook' : need}. ${formatMinutes(totalMinutes(recipe))}.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <RecipeImage source={image} shape="square" cuisine={recipe.cuisine} radius={0} iconSize={40}>
        <View style={styles.pill}>
          <Icon name={ready ? 'check' : 'basket'} size={11} colour="bg" />
          <Text variant="badge" colour="bg">
            {pill}
          </Text>
        </View>
      </RecipeImage>
      <View style={styles.body}>
        <Text variant="eyebrow" tone={cuisineEyebrow(recipe.cuisine, ground)} numberOfLines={1}>
          {CUISINE_LABELS[recipe.cuisine]}
        </Text>
        <Text variant="cardTitleLarge" colour="bg" numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text variant="meta" colour="bgSoft" numberOfLines={2}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: { width: CARD.matchWidth, borderRadius: RADIUS.card, overflow: 'hidden', backgroundColor: colours.ink },
  pressed: { opacity: PRESSED.card },
  pill: {
    position: 'absolute',
    top: CARD.matchPillInset,
    left: CARD.matchPillInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    paddingHorizontal: SPACE.xs,
    paddingVertical: SPACE.xxs,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  body: { paddingHorizontal: JAR.matchBody, paddingTop: SPACE.sm, paddingBottom: JAR.matchBody, gap: SPACE.xxs },
}));
