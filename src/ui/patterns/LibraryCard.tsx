// v1's cream library card (spec §4.6, CookmarksModal): a square photo on a
// dark well, the cuisine eyebrow, a two-line serif title, then time and
// difficulty. On Saved, a cream disc on the photo unsaves the recipe.
// LibraryCardGrid lays them two to a row; an odd last card keeps its width.
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { CUISINE_LABELS, DIFFICULTY_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
import { FIXED } from '@/ui/tokens/colour';
import { LIBRARY, libraryColours } from '@/ui/tokens/library';
import { PRESSED, RADIUS, SHADOW, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type CardProps = {
  recipe: Recipe;
  image: number | undefined;
  onPress: () => void;
  /** Shows the filled bookmark disc; tapping it removes the recipe from Saved. */
  onUnsave?: (() => void) | undefined;
};

export function LibraryCard({ recipe, image, onPress, onUnsave }: CardProps) {
  const styles = useStyles();
  const themeName = useTheme().name;
  const c = libraryColours(themeName);
  const cuisine = CUISINE_LABELS[recipe.cuisine];
  const time = formatMinutes(totalMinutes(recipe));
  const difficulty = DIFFICULTY_LABELS[recipe.difficulty];
  const id = `recipe-card-${recipe.id}`;
  return (
    <Pressable
      onPress={onPress}
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, ${cuisine}, ${time}, ${difficulty}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.well}>
        {image === undefined ? (
          <View style={styles.noPhoto} accessibilityElementsHidden importantForAccessibility="no">
            <Icon name="cook" size={LIBRARY.wellIcon} tone={c.wellIcon} />
          </View>
        ) : (
          <Image source={image} style={styles.photo} contentFit="cover" transition={200} accessible={false} />
        )}
        {onUnsave ? (
          <Pressable
            onPress={onUnsave}
            hitSlop={(TAP_TARGET - LIBRARY.disc) / 2}
            testID={`${id}-save`}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${recipe.title} from saved`}
            style={styles.disc}
          >
            <Icon name="savedFilled" size={LIBRARY.discIcon} tone={c.discInk} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text variant="eyebrow" tone={cuisineEyebrow(recipe.cuisine, themeName)} numberOfLines={1}>
          {cuisine}
        </Text>
        <Text variant="cardTitle" tone={c.title} numberOfLines={2} style={styles.title}>
          {recipe.title}
        </Text>
        <View style={styles.foot}>
          <Icon name="time" size={LIBRARY.metaIcon} tone={c.meta} />
          <Text variant="metaSmall" tone={c.meta}>
            {time}
          </Text>
          <View style={styles.dot} />
          <Text variant="metaSmall" tone={c.meta}>
            {difficulty}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

type GridProps = {
  recipes: readonly Recipe[];
  imageFor: (id: string) => number | undefined;
  onOpen: (id: string) => void;
  onUnsave?: ((recipe: Recipe) => void) | undefined;
};

export function LibraryCardGrid({ recipes, imageFor, onOpen, onUnsave }: GridProps) {
  const styles = useStyles();
  const rows: Recipe[][] = [];
  for (let i = 0; i < recipes.length; i += 2) rows.push(recipes.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((r) => r.id).join()} style={styles.row}>
          {row.map((r) => (
            <View key={r.id} style={styles.cell}>
              <LibraryCard
                recipe={r}
                image={imageFor(r.id)}
                onPress={() => onOpen(r.id)}
                onUnsave={onUnsave ? () => onUnsave(r) : undefined}
              />
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

// Colours come from the library palette, not the theme's: the card is cream
// paper in light mode and warm near-black in dark (tokens/library.ts).
const useStyles = makeStyles(({ name }) => {
  const c = libraryColours(name);
  return {
    grid: { gap: LIBRARY.gridGap, marginHorizontal: LIBRARY.gridX - SPACE.gutter },
    row: { flexDirection: 'row', gap: LIBRARY.gridGap },
    cell: { flex: 1 },
    card: { backgroundColor: c.card, borderRadius: RADIUS.card, overflow: 'hidden' },
    pressed: { opacity: PRESSED.card },
    well: { width: '100%', aspectRatio: 1, backgroundColor: c.well },
    photo: { width: '100%', height: '100%' },
    noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    disc: {
      position: 'absolute',
      top: LIBRARY.discInset,
      right: LIBRARY.discInset,
      width: LIBRARY.disc,
      height: LIBRARY.disc,
      borderRadius: RADIUS.pill,
      backgroundColor: c.disc,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: FIXED.shadow,
      ...SHADOW.photoDisc,
    },
    body: { paddingHorizontal: LIBRARY.bodyX, paddingTop: LIBRARY.bodyTop, paddingBottom: LIBRARY.bodyBottom },
    title: { marginTop: LIBRARY.cardTitleTop, marginBottom: LIBRARY.cardTitleBottom, minHeight: LIBRARY.cardTitleMinHeight },
    foot: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs },
    dot: {
      width: LIBRARY.dot,
      height: LIBRARY.dot,
      borderRadius: RADIUS.pill,
      backgroundColor: c.dot,
      marginHorizontal: LIBRARY.dotGap - SPACE.xxs,
    },
  };
});
