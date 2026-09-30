// Surprise me (spec §7): v1's card-deck spinner. Pick the meal, time and
// whether it should come from the cupboard; tap the card (or Spin again) and
// the deck runs, slows and lands on a dish; "Why this" says, truthfully, why
// it fits. The choosing lives in domain/suggestions/spinner; this screen only
// shows it and times the animation.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { Recipe } from '@/domain/recipes/types';
import { deckPosition, SPIN_DELAYS, type SpinSettings } from '@/domain/suggestions/spinner';
import { announce } from '@/ui/a11y/announce';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { FIXED } from '@/ui/tokens/colour';
import { SPACE, SPINNER } from '@/ui/tokens/type';
import { SpinDeck } from './SpinDeck';
import { HowItWorks, SettingChips, SpinnerHeader, WhyThis } from './SpinnerParts';
import { useSpinner } from './useSpinner';

const KICKER: Record<NonNullable<SpinSettings['meal']> | 'any', string> = {
  dinner: 'Tonight’s dinner',
  lunch: 'Today’s lunch',
  breakfast: 'Breakfast',
  snack: 'A snack',
  any: 'Something to cook',
};

export function SpinnerScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { settings, setSettings, pool, current, reasons, plan, land } = useSpinner();
  const [flash, setFlash] = useState<Recipe | undefined>();
  const [spinning, setSpinning] = useState(false);
  const [tick, setTick] = useState(0);
  const [landed, setLanded] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finish = (recipe: Recipe) => {
    land(recipe);
    setFlash(undefined);
    setSpinning(false);
    setLanded((n) => n + 1);
    // The deck's motion and haptic say "landed" to sighted cooks; VoiceOver needs it said (audit F97).
    announce(`Landed on ${recipe.title}`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };
  const spin = () => {
    if (spinning) return;
    const reel = plan();
    const last = reel?.at(-1);
    if (!reel || !last) return;
    if (reduceMotion) {
      finish(last);
      return;
    }
    setSpinning(true);
    let at = 0;
    reel.forEach((recipe, i) => {
      at += SPIN_DELAYS[i] ?? 0;
      timers.current.push(
        setTimeout(() => {
          if (i === reel.length - 1) finish(recipe);
          else {
            setFlash(recipe);
            setTick((t) => t + 1);
          }
        }, at),
      );
    });
  };

  const shown = flash ?? current;
  const at = deckPosition(pool, shown?.id);
  const neighbour = (step: number) => (pool.length > 1 ? pool[(at - 1 + step + pool.length) % pool.length] : undefined);
  const setSettingsFresh = (next: SpinSettings) => {
    if (!spinning) setSettings(next);
  };

  return (
    <Screen testID="spinner-screen">
      <PhotoScrim kind="spinnerGlow" />
      <PhotoScrim kind="spinnerGlowFoot" />
      <SpinnerHeader at={shown ? at : 0} of={pool.length} onBack={() => router.back()} onInfo={() => setHowOpen(true)} />
      <View style={{ gap: SPACE.sm }}>
        <Text variant="kicker">{KICKER[settings.meal ?? 'any']}</Text>
        <Text variant="displaySpinner" accessibilityRole="header">
          Surprise
          <Text variant="displaySpinnerAccent" tone={FIXED.amberLight}>
            {' me'}
          </Text>
        </Text>
        <Text variant="bodyMedium" colour="inkSoft" style={{ maxWidth: 320 }}>
          {settings.fromCupboard
            ? 'Spin and we’ll pick something you can cook from what you have.'
            : 'Spin and we’ll pick something you’d like to cook tonight.'}
        </Text>
      </View>
      <SettingChips settings={settings} onChange={setSettingsFresh} />
      {!shown ? (
        <EmptyState
          title="No dishes match"
          body={
            settings.fromCupboard
              ? 'Nothing fits with what’s in your cupboard. Loosen a setting above, or add a few things to the cupboard.'
              : 'Loosen a setting above to find one.'
          }
          testID="spinner-empty"
        />
      ) : (
        <>
          <SpinDeck
            recipe={shown}
            before={neighbour(-1)}
            after={neighbour(1)}
            spinning={spinning}
            tick={tick}
            landed={landed}
            reduceMotion={reduceMotion}
            onSpin={spin}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACE.xs,
              opacity: spinning ? SPINNER.hintDim : 1,
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="hand" size={13} colour="inkMuted" />
            <Text variant="hint" colour="inkMuted">
              {spinning ? 'Spinning…' : 'Tap card to spin'}
            </Text>
          </View>
          <View style={{ opacity: spinning ? SPINNER.hintDim : 1 }}>
            <WhyThis reasons={reasons} />
          </View>
          <View style={{ gap: SPACE.sm }}>
            <Button
              label="Spin again"
              icon="refresh"
              kind="primary"
              size="lg"
              block
              disabled={spinning}
              onPress={spin}
              testID="spinner-spin"
            />
            <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Plan it"
                  icon="plan"
                  block
                  disabled={spinning}
                  onPress={() => router.push({ pathname: '/recipe/[id]/plan', params: { id: shown.id } })}
                  testID="spinner-plan"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cook this"
                  icon="arrowForward"
                  block
                  disabled={spinning}
                  onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: shown.id } })}
                  testID="spinner-cook"
                />
              </View>
            </View>
          </View>
        </>
      )}
      <HowItWorks visible={howOpen} onClose={() => setHowOpen(false)} />
    </Screen>
  );
}
