// How a recipe appears in lists, in the original app's three looks (spec §4.6):
// large = "recipe of the day" photo with the title on it, medium = the bordered
// grid card, row = the trending row with a square thumbnail. Every card opens its
// recipe; the bookmark disc appears only when the caller can actually save.
import { Pressable, View } from 'react-native';

import { formatMinutes, CUISINE_LABELS } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
import { CARD, PRESSED, RADIUS, SHADOW, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { PhotoScrim } from './PhotoScrim';
import { RecipeImage } from './RecipeImage';

type Props = {
  recipe: Recipe;
  image: number | undefined;
  size: 'large' | 'medium' | 'row';
  onPress: () => void;
  /** Replaces the default "35 min · Serves 4" line. */
  note?: string;
  /** Row only: the "01" rank beside the thumbnail. */
  rank?: number;
  saved?: boolean;
  onToggleSave?: () => void;
  testID?: string;
};

export function RecipeCard({ recipe, image, size, onPress, note, rank, saved, onToggleSave, testID }: Props) {
  const styles = useStyles();
  const cuisine = CUISINE_LABELS[recipe.cuisine];
  const eyebrow = cuisineEyebrow(recipe.cuisine);
  const meta = note ?? `${formatMinutes(totalMinutes(recipe))} · Serves ${recipe.servings}`;
  const label = `${recipe.title}, ${cuisine}, ${meta}`;
  const id = testID ?? `recipe-card-${recipe.id}`;

  if (size === 'row') {
    return (
      <Pressable
        onPress={onPress}
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {rank !== undefined ? (
          <Text variant="numberLarge" colour="inkMuted" style={styles.rank}>
            {String(rank).padStart(2, '0')}
          </Text>
        ) : null}
        <View style={styles.thumb}>
          <RecipeImage source={image} shape="square" cuisine={recipe.cuisine} radius={RADIUS.md} iconSize={22} />
        </View>
        <View style={styles.rowText}>
          <Text variant="eyebrowLarge" tone={eyebrow} numberOfLines={1}>
            {cuisine}
          </Text>
          <Text variant="cardTitle" numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text variant="meta" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </Pressable>
    );
  }

  const disc =
    onToggleSave !== undefined ? (
      <Pressable
        onPress={onToggleSave}
        hitSlop={(TAP_TARGET - CARD.disc) / 2}
        testID={`${id}-save`}
        accessibilityRole="button"
        accessibilityLabel={saved ? `Remove ${recipe.title} from saved` : `Save ${recipe.title}`}
        accessibilityState={{ selected: saved === true }}
        style={styles.disc}
      >
        <Icon name={saved ? 'savedFilled' : 'saved'} size={CARD.discIcon} colour="accent" tone={saved ? undefined : FIXED.photoDiscInk} />
      </Pressable>
    ) : null;

  if (size === 'large') {
    return (
      <Pressable
        onPress={onPress}
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => pressed && styles.cardPressed}
      >
        <RecipeImage source={image} shape="hero" cuisine={recipe.cuisine} radius={RADIUS.card} iconSize={56}>
          <PhotoScrim kind="heroBottom" />
          {disc}
          <View style={styles.heroBody} pointerEvents="none">
            {/* The original put the cuisine colour straight on the photo, where it was often unreadable (spec §4.6). */}
            <Text variant="eyebrowLarge" tone={FIXED.amberLight} numberOfLines={1}>
              {cuisine}
            </Text>
            <Text variant="onPhoto" tone={FIXED.onPhoto} numberOfLines={2}>
              {recipe.title}
            </Text>
            {note ? (
              <Text variant="meta" tone={FIXED.onPhotoFaint} numberOfLines={1}>
                {note}
              </Text>
            ) : null}
          </View>
        </RecipeImage>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <RecipeImage source={image} shape="card" cuisine={recipe.cuisine} radius={0}>
        {disc}
      </RecipeImage>
      <View style={styles.cardBody}>
        <Text variant="eyebrow" tone={eyebrow} numberOfLines={1}>
          {cuisine}
        </Text>
        <Text variant="cardTitle" numberOfLines={2}>
          {recipe.title}
        </Text>
        {note ? (
          <Text variant="meta" numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CARD.rowGap,
    paddingVertical: CARD.rowGap,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  rowPressed: { opacity: PRESSED.row },
  rank: { width: CARD.rankWidth },
  thumb: { width: CARD.thumb },
  rowText: { flex: 1, gap: SPACE.xxs },
  card: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.card,
    overflow: 'hidden',
  },
  cardPressed: { opacity: PRESSED.card },
  cardBody: { paddingHorizontal: CARD.bodyX, paddingTop: CARD.bodyTop, paddingBottom: CARD.bodyBottom, gap: SPACE.xxs },
  heroBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: CARD.heroBodyX,
    paddingBottom: CARD.heroBodyBottom,
    gap: SPACE.xxs,
  },
  disc: {
    position: 'absolute',
    top: CARD.discInset,
    right: CARD.discInset,
    width: CARD.disc,
    height: CARD.disc,
    borderRadius: CARD.disc / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FIXED.photoDisc,
    shadowColor: FIXED.shadow,
    ...SHADOW.photoDisc,
  },
}));
