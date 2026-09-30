// The spinner's deck (spec §4.19, §6): the dish on show as a tall photo card,
// with the dishes either side of it in the deck tilted behind. The whole card
// is the spin button. Each tick nudges it side to side; the landing
// overshoots a touch and settles. With Reduce Motion the cards just change.
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { SHADOW, SPACE, SPINNER } from '@/ui/tokens/type';

const settleEase = Easing.bezier(...SPINNER.settleCurve);
const driftEase = Easing.bezier(...SPINNER.driftCurve);
const tickEase = Easing.out(Easing.quad);

type Props = {
  recipe: Recipe;
  before: Recipe | undefined;
  after: Recipe | undefined;
  spinning: boolean;
  /** Goes up by one each time a new card flashes past. */
  tick: number;
  /** Goes up by one each time a spin lands. */
  landed: number;
  reduceMotion: boolean;
  onSpin: () => void;
};

export function SpinDeck({ recipe, before, after, spinning, tick, landed, reduceMotion, onSpin }: Props) {
  const styles = useStyles();
  const x = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (tick === 0 || reduceMotion) return;
    const sign = tick % 2 === 0 ? -1 : 1;
    const t = { duration: SPINNER.tick.ms, easing: tickEase };
    x.set(withTiming(sign * SPINNER.tick.x, t));
    tilt.set(withTiming(sign * SPINNER.tick.tilt, t));
    scale.set(withTiming(SPINNER.tick.scale, t));
  }, [tick, reduceMotion, x, tilt, scale]);

  useEffect(() => {
    if (landed === 0) return;
    if (reduceMotion) {
      x.set(0);
      tilt.set(0);
      scale.set(1);
      return;
    }
    const t = { duration: SPINNER.settle.ms, easing: settleEase };
    x.set(withTiming(0, t));
    tilt.set(withTiming(0, t));
    scale.set(withSequence(withTiming(SPINNER.settle.scale, t), withTiming(1, { duration: SPINNER.settle.backMs, easing: tickEase })));
  }, [landed, reduceMotion, x, tilt, scale]);

  useEffect(() => {
    // The deck fans open while it spins.
    drift.set(reduceMotion ? 0 : withTiming(spinning ? 1 : 0, { duration: SPINNER.driftMs, easing: driftEase }));
  }, [spinning, reduceMotion, drift]);

  const heroMotion = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { rotate: `${tilt.get()}deg` }, { scale: scale.get() }],
  }));
  const minutes = totalMinutes(recipe);
  const difficulty = recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1);

  return (
    <View style={styles.stage}>
      {before ? <Peek recipe={before} side={-1} drift={drift} /> : null}
      {after ? <Peek recipe={after} side={1} drift={drift} /> : null}
      <Animated.View style={[styles.hero, heroMotion]}>
        <Pressable
          onPress={onSpin}
          disabled={spinning}
          accessibilityRole="button"
          accessibilityLabel={`${recipe.title}. Spin for another dish`}
          accessibilityState={{ busy: spinning }}
          testID="spinner-card"
        >
          <RecipeImage
            source={RECIPE_IMAGES[recipe.id]}
            shape="spinner"
            cuisine={recipe.cuisine}
            radius={SPINNER.radius}
            iconSize={80}
            transition={0}
          >
            <PhotoScrim kind="spinnerBottom" />
            <View style={styles.corner} pointerEvents="none">
              <View style={styles.rule} />
              <Text variant="eyebrowSpinner" tone={FIXED.amberLight} numberOfLines={1}>
                {CUISINE_LABELS[recipe.cuisine]}
              </Text>
            </View>
            <View style={styles.label} pointerEvents="none">
              <Text variant="onPhoto" tone={FIXED.onPhotoCream} numberOfLines={2} testID="spinner-title">
                {recipe.title}
              </Text>
              <View style={styles.meta}>
                {minutes > 0 ? (
                  <>
                    <Icon name="time" size={13} tone={FIXED.onPhotoMuted} />
                    <Text variant="value" tone={FIXED.onPhotoMuted}>
                      {formatMinutes(minutes)}
                    </Text>
                    <Text variant="value" tone={FIXED.onPhotoDot}>
                      ·
                    </Text>
                  </>
                ) : null}
                <Text variant="value" tone={FIXED.onPhotoMuted}>
                  {difficulty}
                </Text>
              </View>
            </View>
          </RecipeImage>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** A dish behind the one on show, dimmed and tilted so the deck reads as a deck. */
function Peek({ recipe, side, drift }: { recipe: Recipe; side: 1 | -1; drift: SharedValue<number> }) {
  const styles = useStyles();
  const { peek } = SPINNER;
  const motion = useAnimatedStyle(() => {
    const d = drift.get();
    return {
      transform: [
        { translateX: side * (peek.x + (peek.xOpen - peek.x) * d) },
        { translateY: peek.y + (peek.yOpen - peek.y) * d },
        { rotate: `${side * (peek.tilt + (peek.tiltOpen - peek.tilt) * d)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.peek, { zIndex: side === -1 ? 1 : 2 }, motion]} pointerEvents="none">
      <RecipeImage
        source={RECIPE_IMAGES[recipe.id]}
        shape="spinner"
        cuisine={recipe.cuisine}
        radius={SPINNER.radius}
        iconSize={48}
        transition={0}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FIXED.peekDim }]} />
      </RecipeImage>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  stage: {
    alignItems: 'center',
    paddingHorizontal: SPINNER.stagePadX - SPACE.gutter,
    paddingTop: SPACE.xxs,
    paddingBottom: SPACE.xl,
  },
  hero: {
    width: '100%',
    maxWidth: SPINNER.heroMax,
    borderRadius: SPINNER.radius,
    backgroundColor: colours.bgSoft,
    zIndex: 3,
    shadowColor: FIXED.shadow,
    ...SHADOW.hero,
  },
  peek: {
    position: 'absolute',
    top: SPACE.xxs,
    width: `${SPINNER.peekShare * 100}%`,
    maxWidth: SPINNER.peekMax,
    borderRadius: SPINNER.radius,
    backgroundColor: colours.bgSoft,
    shadowColor: FIXED.shadow,
    ...SHADOW.peek,
  },
  corner: {
    position: 'absolute',
    top: SPINNER.cornerInset,
    left: SPINNER.cornerInset,
    right: SPINNER.cornerInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPINNER.cornerGap,
  },
  rule: { width: SPINNER.cornerRule, height: 1, backgroundColor: FIXED.amberRule },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPINNER.labelBottom,
    paddingTop: SPINNER.labelTop,
    gap: SPACE.xs,
  },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPINNER.metaGap },
}));
