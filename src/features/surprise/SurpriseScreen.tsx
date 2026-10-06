// Surprise me (spec §7): v1's card deck (it called it the spinner). Pick the meal, time and
// whether it should come from the cupboard; tap the card (or Spin again) and
// the deck runs, slows and lands on a dish; "Why this" says, truthfully, why
// it fits. The choosing lives in domain/suggestions/surpriseDeck; this screen only
// shows it and times the animation.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { Recipe } from '@/domain/recipes/types';
import { deckPosition, SPIN_DELAYS, type SpinSettings } from '@/domain/suggestions/surpriseDeck';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE, SURPRISE } from '@/ui/tokens/type';
import { SpinDeck } from './SpinDeck';
import { HowItWorks, SettingChips, SurpriseHeader, WhyThis } from './SurpriseParts';
import { useSurprise } from './useSurprise';
import { goBack } from '@/lib/navigation';

const KICKER: Record<NonNullable<SpinSettings['meal']> | 'any', string> = {
  dinner: 'Tonight’s dinner',
  lunch: 'Today’s lunch',
  breakfast: 'Breakfast',
  snack: 'A snack',
  any: 'Something to cook',
};

export function SurpriseScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { settings, setSettings, pool, current, reasons, plan, land } = useSurprise();
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
    <Screen testID="surprise-screen">
      <PhotoScrim kind="surpriseGlow" />
      <PhotoScrim kind="surpriseGlowFoot" />
      <SurpriseHeader at={shown ? at : 0} of={pool.length} onBack={() => goBack(router)} onInfo={() => setHowOpen(true)} />
      <View style={{ gap: SPACE.sm }}>
        <Text variant="kicker">{KICKER[settings.meal ?? 'any']}</Text>
        <Text variant="displaySurprise" accessibilityRole="header">
          Surprise
          <Text variant="displaySurpriseAccent" colour="accentText">
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
          testID="surprise-empty"
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
              opacity: spinning ? SURPRISE.hintDim : 1,
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="hand" size={13} colour="inkMuted" />
            <Text variant="hint" colour="inkMuted">
              {spinning ? 'Spinning…' : 'Tap card to spin'}
            </Text>
          </View>
          <View accessibilityLiveRegion="polite" style={{ opacity: spinning ? SURPRISE.hintDim : 1 }}>
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
              testID="surprise-spin"
            />
            <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Plan it"
                  icon="plan"
                  block
                  disabled={spinning}
                  onPress={() => router.push({ pathname: '/recipe/[id]/plan', params: { id: shown.id } })}
                  testID="surprise-plan"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cook this"
                  trailingIcon="arrowForward"
                  block
                  disabled={spinning}
                  onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: shown.id } })}
                  testID="surprise-cook"
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
