// Cook Mode: one step at a time in large type, screen kept on, tap anywhere
// to move on (D-004), timers you start with a tap, and Done logs the cook.
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { localiseStepText, splitStepTimers } from '@/domain/cook/cook';
import { cookable } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { anyRunning } from '@/domain/cook/timers';
import { formatLine, scaleLine } from '@/domain/ingredients/format';
import { parseServings } from '@/domain/recipes/servings';
import { goBackOr } from '@/lib/navigation';
import { ingredientName } from '@/store/cookable';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { capitaliseLine, IngredientGroups } from '@/ui/patterns/IngredientGroups';
import { useToast } from '@/ui/patterns/Toast';
import { useOnce } from '@/ui/patterns/useOnce';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { MOTION, SPACE } from '@/ui/tokens/type';
import { LeaveConfirm } from './LeaveConfirm';
import { TimerBar } from './TimerBar';
import { useCookTimers } from './useCookTimers';
import { UsedUpSheet } from './UsedUpSheet';

const SWIPE_DISTANCE = 60;

/** `servings` is the raw route param; anything but a whole number 1–50 falls back to the recipe's own (audit F52). */
export function CookScreen({ id, servings: requested }: { id: string; servings?: string | undefined }) {
  useKeepAwake('cook-mode');
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
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
  const { timers, start, dismiss } = useCookTimers();
  const once = useOnce();
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Leaving with a timer still counting down asks first (audit F45); finished timers don't count.
  const leave = () => (anyRunning(timers, Date.now()) ? setConfirmLeave(true) : goBackOr(router));
  useEffect(() => {
    // Android's back button leaves the same way × does, so it asks too.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!anyRunning(timers, Date.now())) return false;
      setConfirmLeave(true);
      return true;
    });
    return () => sub.remove();
  }, [timers]);

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top + SPACE.xl, paddingHorizontal: SPACE.gutter }}>
        <EmptyState
          title="We couldn’t find that recipe"
          body="It may have been removed."
          action={{ label: 'Close', onPress: () => goBackOr(router) }}
          testID="cook-missing"
        />
      </View>
    );
  }

  const total = recipe.steps.length;
  const last = step === total - 1;
  const servings = parseServings(requested) ?? recipe.servings;
  const next = () => (last ? undefined : setStep(step + 1));
  const previous = () => (step === 0 ? undefined : setStep(step - 1));
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
  const used = (() => {
    if (!cupboard.size) return [];
    const c = cookable(recipe, cupboard, shelf, INGREDIENTS, KITCHEN);
    return [...c.have, ...c.swaps.map((s) => s.use)].filter((i) => KITCHEN.isPerishable(i));
  })();
  // Once only: Cook Mode takes a moment to close, and a second tap would log the cook twice (audit F163).
  const finish = once((usedUp: string[]) => {
    setAskUsedUp(false);
    const event = markCooked(recipe.id);
    for (const i of usedUp) removeFromCupboard(i);
    goBackOr(router);
    toast({ message: `${recipe.title} cooked. Nice work.`, undo: () => undoCooked(event.id) });
  });
  const done = () => (used.length ? setAskUsedUp(true) : finish([]));
  const text = localiseStepText(recipe.steps[step]?.text ?? '', units);

  return (
    <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, SPACE.sm) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.xs }}>
        <IconButton icon="close" label="Leave Cook Mode" onPress={leave} testID="cook-close" />
        <Text variant="kicker" align="center" style={{ flex: 1 }} accessibilityLiveRegion="polite">
          Step {step + 1} of {total}
        </Text>
        <Button
          label={showIngredients ? 'Steps' : 'Ingredients'}
          kind="quiet"
          onPress={() => setShowIngredients(!showIngredients)}
          testID="cook-toggle-ingredients"
        />
      </View>
      <View style={{ paddingHorizontal: SPACE.gutter, paddingTop: SPACE.xs, gap: SPACE.xs }}>
        {confirmLeave ? <LeaveConfirm onStay={() => setConfirmLeave(false)} onLeave={() => goBackOr(router)} /> : null}
        <TimerBar timers={timers} onDismiss={dismiss} />
      </View>
      {showIngredients ? (
        <ScrollView contentContainerStyle={{ padding: SPACE.gutter, gap: SPACE.sm }}>
          <Text variant="title">For {servings}</Text>
          <IngredientGroups
            groups={recipe.ingredientGroups}
            gap={SPACE.sm}
            renderLine={(line, key) => (
              <Text key={key} variant="body" testID={`cook-ingredient-${key}`}>
                {capitaliseLine(formatLine(scaleLine(line, servings / recipe.servings), units))}
              </Text>
            )}
          />
        </ScrollView>
      ) : (
        // Tapping anywhere moves on for floury hands; VoiceOver uses the Next button instead, so the
        // step text and its timer buttons stay individually reachable.
        <GestureDetector gesture={swipe}>
          <Pressable onPress={next} disabled={last} accessible={false} style={{ flex: 1 }} testID="cook-step">
            <ScrollView contentContainerStyle={{ padding: SPACE.gutter, flexGrow: 1, justifyContent: 'center' }}>
              <Animated.View key={step} {...(reduceMotion ? {} : { entering: FadeIn.duration(MOTION.standard) })}>
                <Text variant="numberItalic">{step + 1}</Text>
                <Text variant="title" style={{ fontSize: 30, lineHeight: 42 }} testID="cook-step-text">
                  {splitStepTimers(text).map((seg, i) =>
                    seg.type === 'text' ? (
                      seg.text
                    ) : (
                      <Text
                        key={i}
                        variant="title"
                        colour="accent"
                        style={{ fontSize: 30, lineHeight: 42, textDecorationLine: 'underline' }}
                        accessibilityRole="button"
                        accessibilityLabel={`Start a ${seg.label} timer`}
                        onPress={() => void start(seg.label, step, seg.seconds, text)}
                      >
                        {seg.label}
                      </Text>
                    ),
                  )}
                </Text>
                {splitStepTimers(text).some((s) => s.type === 'timer') ? (
                  <Text variant="meta" style={{ paddingTop: SPACE.sm }}>
                    Tap a time to start a timer.
                  </Text>
                ) : null}
              </Animated.View>
            </ScrollView>
          </Pressable>
        </GestureDetector>
      )}
      <View style={{ flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.gutter, paddingTop: SPACE.sm }}>
        <Button label="Back" icon="back" onPress={previous} disabled={step === 0} testID="cook-back" />
        <View style={{ flex: 1 }}>
          {last ? (
            <Button label="Done" icon="check" kind="primary" block onPress={done} testID="cook-done" />
          ) : (
            <Button label="Next step" kind="primary" block onPress={next} testID="cook-next" />
          )}
        </View>
      </View>
      <UsedUpSheet visible={askUsedUp} ids={used} nameOf={(i) => capitaliseLine(ingredientName(i))} onFinish={finish} />
    </View>
  );
}
