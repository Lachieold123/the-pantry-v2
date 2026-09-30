// Surprise me: the one playful moment (map §2). A reel of dish names slows
// to a stop with haptic ticks; with Reduce Motion it simply fades in.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import type { TimeFilter } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { MOTION, SPACE } from '@/ui/tokens/type';
import { useSurprise } from './useSurprise';

const TIMES: { value: TimeFilter | undefined; label: string }[] = [
  { value: undefined, label: 'Any time' },
  { value: 'under-30', label: '30 min' },
  { value: 'under-45', label: '45 min' },
];
// Delays between reel frames, slowing down like a wheel losing speed.
const REEL = [60, 60, 70, 80, 90, 110, 130, 160, 200, 250, 320];

export function SurpriseScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [time, setTime] = useState<TimeFilter | undefined>(undefined);
  const { pool, pick } = useSurprise(time);
  const [result, setResult] = useState<Recipe | undefined>();
  const [reel, setReel] = useState<string | undefined>();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spin = () => {
    const chosen = pick();
    if (!chosen) return;
    setResult(undefined);
    if (reduceMotion) {
      setResult(chosen);
      return;
    }
    let at = 0;
    REEL.forEach((delay, i) => {
      at += delay;
      timers.current.push(
        setTimeout(() => {
          setReel(pool[Math.floor(Math.random() * pool.length)]?.title);
          void Haptics.selectionAsync();
          if (i === REEL.length - 1) {
            setReel(undefined);
            setResult(chosen);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, at),
      );
    });
  };

  const open = (path: '/recipe/[id]/cook' | '/recipe/[id]/plan', recipe: Recipe) => {
    router.back();
    router.push({ pathname: path, params: { id: recipe.id } });
  };

  return (
    <Sheet title="Surprise me" onClose={() => router.back()}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        {TIMES.map((t) => (
          <Chip
            key={t.label}
            label={t.label}
            selected={time === t.value}
            onPress={() => setTime(t.value)}
            testID={`surprise-time-${t.value ?? 'any'}`}
          />
        ))}
      </View>
      {pool.length === 0 ? (
        <EmptyState
          title="Nothing fits right now"
          body="Your diet, things to avoid and time limit rule out every dinner. Try a longer time, or change them in Settings."
          testID="surprise-empty"
        />
      ) : reel ? (
        <View
          style={{ minHeight: 280, justifyContent: 'center' }}
          accessibilityLiveRegion="none"
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="display" align="center">
            {reel}
          </Text>
        </View>
      ) : result ? (
        <Animated.View entering={FadeIn.duration(MOTION.slow)} style={{ gap: SPACE.md }} accessibilityLiveRegion="polite">
          <RecipeCard
            recipe={result}
            image={RECIPE_IMAGES[result.id]}
            size="large"
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: result.id } })}
            testID="surprise-result"
          />
          <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
            <View style={{ flex: 1 }}>
              <Button label="Plan it" icon="plan" block onPress={() => open('/recipe/[id]/plan', result)} testID="surprise-plan" />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Cook it"
                icon="timer"
                kind="primary"
                block
                onPress={() => open('/recipe/[id]/cook', result)}
                testID="surprise-cook"
              />
            </View>
          </View>
          <Button label="Spin again" kind="quiet" onPress={spin} testID="surprise-spin-again" />
        </Animated.View>
      ) : (
        <View style={{ gap: SPACE.md, paddingVertical: SPACE.xl }}>
          <Text variant="title">Can’t decide?</Text>
          <Text variant="body" colour="inkSoft">
            We’ll pick one of {pool.length} dinners that suit you, leaving out what’s already planned and what you’ve cooked lately.
          </Text>
          <Button label="Spin" kind="primary" block onPress={spin} testID="surprise-spin" />
        </View>
      )}
    </Sheet>
  );
}
