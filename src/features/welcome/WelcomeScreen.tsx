// First launch: hello → "Anything you don't eat?" → "What's in your
// cupboard?" → Home, on What I have. Cooking from what you have is the point
// of the app (D-034), so the welcome ends with a stocked cupboard, not a quiz;
// cuisines and weeknight time are learnt or set later in Settings → Cooking.
// Skippable at every step, and Settings' "Redo welcome flow" opens it again
// with the answers kept. The look is v1's onboarding (spec §4.21).
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { pickedLabel } from '@/domain/welcome/cupboardPicks';
import { useCupboard } from '@/store/cupboard';
import { usePreferences } from '@/store/preferences';
import { CupboardStep, useCupboardPicks } from './CupboardStep';
import { EatStep, useEatsEverything } from './EatStep';
import { TextButton, WhitePill } from './OnVideo';
import { HelloStep, QuizFrame } from './WelcomeFrame';

type Step = 'hello' | 'eat' | 'cupboard';

export function WelcomeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('hello');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const setOnboarded = usePreferences((s) => s.setOnboarded);
  const addToCupboard = useCupboard((s) => s.add);
  const eatsEverything = useEatsEverything();
  const picks = useCupboardPicks();
  // Going back and changing the diet can drop a ticked item from the grid; only what's still offered counts.
  const chosen = picks.filter((id) => picked.has(id));

  // Home opens on What I have whenever the cupboard can make something (D-034), and the tour starts (D-035).
  const finish = () => {
    setOnboarded(true);
    router.replace('/');
  };
  // Having just said what's in the cupboard, Home opens on What I have even if nothing is fully ready.
  const stockAndFinish = () => {
    if (!chosen.length) return finish();
    addToCupboard(chosen, 'manual');
    setOnboarded(true);
    router.replace({ pathname: '/', params: { show: 'pantry' } });
  };
  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (step === 'hello') return <HelloStep onStart={() => setStep('eat')} onSkip={finish} />;

  if (step === 'eat') {
    return (
      <QuizFrame
        progress={1 / 2}
        onSkip={finish}
        footer={
          <>
            <TextButton label="Back" onPress={() => setStep('hello')} testID="welcome-back" />
            <WhitePill label={eatsEverything ? 'None of these' : 'Continue'} onPress={() => setStep('cupboard')} testID="welcome-next" />
          </>
        }
      >
        <EatStep />
      </QuizFrame>
    );
  }

  // With nothing left to offer (a redo with a full cupboard) the main button just finishes, so it's never dead.
  const canFinish = chosen.length > 0 || picks.length === 0;
  return (
    <QuizFrame
      progress={1}
      onSkip={finish}
      note={picks.length ? pickedLabel(chosen.length) : undefined}
      footer={
        <>
          <TextButton label="Back" onPress={() => setStep('eat')} testID="welcome-back" />
          <WhitePill label="Show what I can cook" onPress={stockAndFinish} disabled={!canFinish} testID="welcome-finish" />
        </>
      }
    >
      <CupboardStep picks={picks} picked={picked} onToggle={toggle} onSkip={finish} />
    </QuizFrame>
  );
}
