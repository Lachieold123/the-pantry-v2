// v1's hero carousel (FeedScreen.tsx): big portrait cards you swipe through
// one at a time, a dark fade at the foot of each photo carrying an amber
// label, the dish in white serif and a meta line, with dots underneath.
import { useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, DIFFICULTY_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes } from '@/domain/recipes/types';
import { heroKicker, type Hero } from '@/domain/suggestions/home';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { HOME } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';

type Props = {
  heroes: readonly Hero[];
  servingsFor: (hero: Hero) => number;
  /** What a "nearly" dish still needs, for its label. */
  needFor?: ((id: string) => string | undefined) | undefined;
  onOpen: (id: string) => void;
};

export function HeroCarousel({ heroes, servingsFor, needFor, onOpen }: Props) {
  const styles = useStyles();
  // Measured, not the window width: the page may be narrower than the window (web, tablets).
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pageWidth = width + SPACE.gutter * 2;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  return (
    <View onLayout={onLayout} testID="home-heroes">
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          style={{ marginHorizontal: -SPACE.gutter }}
        >
          {heroes.map((hero) => (
            <View key={hero.recipe.id} style={{ width: pageWidth, paddingHorizontal: SPACE.gutter }}>
              <HeroCard hero={hero} servings={servingsFor(hero)} need={needFor?.(hero.recipe.id)} onPress={() => onOpen(hero.recipe.id)} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      {heroes.length > 1 ? (
        <View style={styles.dots} accessible accessibilityLabel={`Card ${page + 1} of ${heroes.length}. Swipe for more.`}>
          {heroes.map((h, i) => (
            <View key={h.recipe.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroCard({ hero, servings, need, onPress }: { hero: Hero; servings: number; need: string | undefined; onPress: () => void }) {
  const styles = useStyles();
  const { recipe } = hero;
  const minutes = totalMinutes(recipe);
  const meta = [
    minutes > 0 ? formatMinutes(minutes) : undefined,
    hero.reason === 'planned' ? `Dinner for ${servings}` : `Serves ${recipe.servings}`,
    CUISINE_LABELS[recipe.cuisine],
  ]
    .filter(Boolean)
    .join(' · ');
  const kicker = heroKicker(hero, DIFFICULTY_LABELS[recipe.difficulty], need);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}. ${kicker}. ${meta}`}
      testID={`home-hero-${recipe.id}`}
      style={({ pressed }) => pressed && { opacity: PRESSED.card }}
    >
      <RecipeImage source={RECIPE_IMAGES[recipe.id]} shape="portrait" cuisine={recipe.cuisine} radius={RADIUS.card} iconSize={64}>
        <PhotoScrim kind="feedBottom" />
        <View style={styles.body} pointerEvents="none">
          <Text variant="eyebrowLarge" tone={FIXED.amberLight} numberOfLines={1} style={{ marginBottom: HOME.kickerGap }}>
            {kicker}
          </Text>
          <Text variant="onPhotoLarge" tone={FIXED.onPhoto} numberOfLines={2} style={{ marginBottom: HOME.titleGap }}>
            {recipe.title}
          </Text>
          <Text variant="bodySmall" tone={FIXED.onPhotoFaint} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </RecipeImage>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  body: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: HOME.cardBodyX, paddingBottom: HOME.cardBodyBottom },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: HOME.dotGap, paddingTop: HOME.dotsTop },
  dot: { width: HOME.dot, height: HOME.dot, borderRadius: HOME.dot / 2, backgroundColor: colours.inkSubtle },
  dotActive: { width: HOME.dotActive, backgroundColor: colours.accent },
}));
