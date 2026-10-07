// Cook Mode in v1's look (spec §4.20): one step at a time in large type, screen
// kept on, tap anywhere or swipe to move on (D-004), timers you start with a
// tap, the ingredients a sheet away, and Done logs the cook.
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { cookable } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { goBack } from '@/lib/navigation';
import { ingredientName } from '@/store/cookable';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { announce } from '@/ui/primitives/accessibility';
import { useToast } from '@/ui/patterns/Toast';
import { makeStyles } from '@/ui/theme/makeStyles';
import { COOK } from '@/ui/tokens/cook';
import { MOTION, SPACE } from '@/ui/tokens/type';
import { CookFooter } from './CookFooter';
import { CookHeader } from './CookHeader';
import { CookIngredientsSheet } from './CookIngredientsSheet';
import { CookStep } from './CookStep';
import { TimerBar } from './TimerBar';
import { useCookTimers } from './useCookTimers';
import { UsedUpSheet } from './UsedUpSheet';

const SWIPE_DISTANCE = 60;

export function CookScreen({ id, servings: requested }: { id: string; servings?: number | undefined }) {
  // Keep the screen on while cooking. Where it can't (some browsers), cooking still works.
  useEffect(() => {
    activateKeepAwakeAsync('cook-mode').catch(() => undefined);
    return () => {
      void Promise.resolve(deactivateKeepAwake('cook-mode')).catch(() => undefined);
    };
  }, []);
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const units = usePreferences((s) => s.units);
  const markCooked = useCookLog((s) => s.markCooked);
  const undoCooked = useCookLog((s) => s.undo);
  const recipe = useRecipe(id);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [askUsedUp, setAskUsedUp] = useState(false);
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const removeFromCupboard = useCupboard((s) => s.remove);
  const cupboard = useMemo(() => cupboardIds(items), [items]);
  const fromCupboard = useMemo(
    () => (recipe && cupboard.size ? cookable(recipe, cupboard, shelf, INGREDIENTS, KITCHEN) : undefined),
    [recipe, cupboard, shelf],
  );
  // A same-family stand-in you have (brown onion for white) earns the HAVE pill too, as on the recipe page.
  const have = useMemo(
    () => (fromCupboard ? new Set([...cupboard, ...fromCupboard.swaps.map((s) => s.need)]) : cupboard),
    [cupboard, fromCupboard],
  );
  const { timers, now, start, dismiss } = useCookTimers(recipe?.title ?? '');

  if (!recipe) {
    return (
      <View style={[styles.page, styles.missing, { paddingTop: insets.top + SPACE.xl }]}>
        <EmptyState
          title="We couldn’t find that recipe"
          body="It may have been removed."
          action={{ label: 'Close', onPress: () => goBack(router) }}
          testID="cook-missing"
        />
      </View>
    );
  }

  const total = recipe.steps.length;
  const last = step === total - 1;
  const servings = requested && requested > 0 ? requested : recipe.servings;
  // A light tick under the thumb confirms the step changed without looking (v1 did the same).
  const go = (to: number) => {
    if (to < 0 || to >= total) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
    setStep(to);
    // VoiceOver stays on the button that was pressed, so read the new step out (Android's counter is a live region).
    if (Platform.OS !== 'android') announce(`Step ${to + 1} of ${total}. ${recipe.steps[to]?.text ?? ''}`);
  };
  const next = () => go(step + 1);
  const previous = () => go(step - 1);
  // Swipe left for the next step, right to go back. Horizontal only, so the step text still scrolls.
  const swipe = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -SWIPE_DISTANCE) next();
      else if (e.translationX > SWIPE_DISTANCE) previous();
    });
  // Fresh things this recipe took from the cupboard: offered for removal once you're done.
  const used = fromCupboard ? [...fromCupboard.have, ...fromCupboard.swaps.map((s) => s.use)].filter((i) => KITCHEN.isPerishable(i)) : [];
  const finish = (usedUp: string[]) => {
    setAskUsedUp(false);
    const event = markCooked(recipe.id);
    for (const i of usedUp) removeFromCupboard(i);
    goBack(router);
    toast({ message: `${recipe.title} cooked. Nice work.`, undo: () => undoCooked(event.id) });
  };
  const done = () => (used.length ? setAskUsedUp(true) : finish([]));

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, SPACE.sm) }]}>
      <CookHeader
        title={recipe.title}
        step={step}
        total={total}
        onClose={() => goBack(router)}
        onIngredients={() => setShowIngredients(true)}
      />
      <View style={styles.timers}>
        <TimerBar timers={timers} now={now} onDismiss={dismiss} />
      </View>
      {/* Tapping anywhere moves on for floury hands; VoiceOver uses the Next button instead, so the
          step text and its timer chips stay individually reachable. */}
      <GestureDetector gesture={swipe}>
        <Pressable onPress={next} disabled={last} accessible={false} style={styles.body} testID="cook-step">
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View key={step} {...(reduceMotion ? {} : { entering: FadeIn.duration(MOTION.standard) })}>
              <CookStep
                text={recipe.steps[step]?.text ?? ''}
                step={step}
                timers={timers}
                now={now}
                onStartTimer={(label, seconds) => void start(label, step, seconds)}
              />
            </Animated.View>
          </ScrollView>
        </Pressable>
      </GestureDetector>
      <CookFooter first={step === 0} last={last} onPrevious={previous} onNext={next} onDone={done} />
      <CookIngredientsSheet
        visible={showIngredients}
        recipe={recipe}
        servings={servings}
        units={units}
        have={have}
        onClose={() => setShowIngredients(false)}
      />
      <UsedUpSheet visible={askUsedUp} ids={used} nameOf={(i) => capitalise(ingredientName(i))} onFinish={finish} />
    </View>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const useStyles = makeStyles(({ colours }) => ({
  page: { flex: 1, backgroundColor: colours.bg },
  missing: { paddingHorizontal: SPACE.gutter },
  timers: { paddingHorizontal: SPACE.gutter, paddingTop: SPACE.xs },
  body: { flex: 1, paddingHorizontal: SPACE.sheet, paddingTop: COOK.bodyTop },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: COOK.bodyBottom },
}));
