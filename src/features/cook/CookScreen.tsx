// Cook Mode: one step at a time in large type, screen kept on, tap anywhere
// to move on (D-004), timers you start with a tap, and Done logs the cook.
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { splitStepTimers } from '@/domain/cook/cook';
import { formatLine, scaleLine } from '@/domain/ingredients/format';
import { allLines } from '@/domain/recipes/types';
import { useCookLog } from '@/store/cookLog';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { MOTION, SPACE } from '@/ui/tokens/type';
import { TimerBar } from './TimerBar';
import { useCookTimers } from './useCookTimers';

const SWIPE_DISTANCE = 60;

export function CookScreen({ id, servings: requested }: { id: string; servings?: number | undefined }) {
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
  const { timers, now, start, dismiss } = useCookTimers(recipe?.title ?? '');

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top + SPACE.xl, paddingHorizontal: SPACE.gutter }}>
        <EmptyState
          title="We couldn’t find that recipe"
          body="It may have been removed."
          action={{ label: 'Close', onPress: () => router.back() }}
          testID="cook-missing"
        />
      </View>
    );
  }

  const total = recipe.steps.length;
  const last = step === total - 1;
  const servings = requested && requested > 0 ? requested : recipe.servings;
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
  const done = () => {
    const event = markCooked(recipe.id);
    router.back();
    toast({ message: `${recipe.title} cooked. Nice work.`, undo: () => undoCooked(event.id) });
  };
  const text = recipe.steps[step]?.text ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, SPACE.sm) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.xs }}>
        <IconButton icon="close" label="Leave Cook Mode" onPress={() => router.back()} testID="cook-close" />
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
      <View style={{ paddingHorizontal: SPACE.gutter, paddingTop: SPACE.xs }}>
        <TimerBar timers={timers} now={now} onDismiss={dismiss} />
      </View>
      {showIngredients ? (
        <ScrollView contentContainerStyle={{ padding: SPACE.gutter, gap: SPACE.sm }}>
          <Text variant="title">For {servings}</Text>
          {allLines(recipe).map((line, i) => (
            <Text key={i} variant="body">
              {formatLine(scaleLine(line, servings / recipe.servings), units)}
            </Text>
          ))}
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
                        onPress={() => void start(seg.label, step, seg.seconds)}
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
    </View>
  );
}
