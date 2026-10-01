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
import { logger } from '@/lib/logger';
import { announce } from '@/ui/a11y/announce';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { FIXED } from '@/ui/tokens/colour';
import { SPACE, SPINNER } from '@/ui/tokens/type';
import { SpinDeck } from './SpinDeck';
import { HowItWorks, SettingChips, SpinnerEmpty, SpinnerHeader, WhyThis } from './SpinnerParts';
import { useSpinner } from './useSpinner';
import { goBack } from '@/lib/navigation';

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
  const { settings, setSettings, pool, current, reasons, plan, land, emptyBecause } = useSpinner();
  const [flash, setFlash] = useState<Recipe | undefined>();
  const [spinning, setSpinning] = useState(false);
  const [tick, setTick] = useState(0);
  const [landed, setLanded] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // State lags a render behind: a tap on the card and on Spin again in the same frame
  // would both start a reel, so the guard is a ref (audit F29).
  const busy = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finish = (recipe: Recipe) => {
    busy.current = false;
    land(recipe);
    setFlash(undefined);
    setSpinning(false);
    setLanded((n) => n + 1);
    // The deck's motion and haptic say "landed" to sighted cooks; VoiceOver needs it said (audit F97).
    announce(`Landed on ${recipe.title}`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((e: unknown) =>
      logger.warn('haptics', 'no haptic feedback', e),
    );
  };
  const spin = () => {
    if (busy.current) return;
    const reel = plan();
    const last = reel?.at(-1);
    if (!reel || !last) return;
    busy.current = true;
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
      <SpinnerHeader at={shown ? at : 0} of={pool.length} onBack={() => goBack(router)} onInfo={() => setHowOpen(true)} />
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
            : `Spin and we’ll pick something you’d like to cook${settings.meal === 'dinner' ? ' tonight' : ''}.`}
        </Text>
      </View>
      <SettingChips settings={settings} onChange={setSettingsFresh} />
      {!shown ? (
        <SpinnerEmpty
          because={emptyBecause ?? 'settings'}
          fromCupboard={settings.fromCupboard}
          onAnything={() => setSettings({ meal: undefined, time: undefined, fromCupboard: false })}
          onSettings={() => router.push('/settings')}
          onAddRecipe={() => router.push('/my-recipe/edit')}
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
                  trailingIcon="arrowForward"
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
