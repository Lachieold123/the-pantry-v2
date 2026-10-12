// First launch, in v1's order (P7, spec §4.21): hello (and the terms, once
// they're published) → what brings you here → what you eat and avoid →
// cuisines → weeknight time and skill → what's in your cupboard → "Tonight,
// for you" → the notification primer → Home, with the first-run checklist and
// the tour (D-035). The order lives in domain/welcome/onboarding.
//
// Skip on the top bar leaves from any question; Back and every answer are kept
// as they're tapped. Settings' "Redo welcome flow" opens it again with the
// answers in place, without asking for the terms twice.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { toISODate } from '@/domain/plan/week';
import type { Recipe } from '@/domain/recipes/types';
import { pickedLabel } from '@/domain/welcome/cupboardPicks';
import { nextStep, previousStep, stepProgress, type WelcomeStep } from '@/domain/welcome/onboarding';
import { agreementLinks } from '@/lib/legal';
import { setSundayReminder } from '@/lib/notifications';
import { useChecklist } from '@/store/checklist';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useForYou } from '@/store/suggestions';
import { useToast } from '@/ui/patterns/Toast';
import { CupboardStep, useCupboardPicks } from './CupboardStep';
import { EatStep, useEatsEverything } from './EatStep';
import { TextButton, WhitePill } from './OnVideo';
import { NotifyStep, RevealBody, RevealEmpty } from './RevealSteps';
import { CuisineStep, IntentStep, TimeStep } from './TasteSteps';
import { HelloStep, QuizFrame } from './WelcomeFrame';

/** Three picks on show; "Spin again" walks through this many in all. */
const SHOWN = 3;
const POOL = SHOWN * 3;

export function WelcomeScreen({ legal = agreementLinks() }: { legal?: ReturnType<typeof agreementLinks> }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<WelcomeStep>('hello');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [stocked, setStocked] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [offset, setOffset] = useState(0);
  const [chosenId, setChosenId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [planned, setPlanned] = useState<string | undefined>();
  // Read once: switching the reminder on in the primer shouldn't reshape the steps mid-way.
  const [options] = useState(() => ({ reminderOn: usePreferences.getState().sundayReminder }));
  const termsAcceptedAt = usePreferences((s) => s.termsAcceptedAt);
  const acceptTerms = usePreferences((s) => s.acceptTerms);
  const setOnboarded = usePreferences((s) => s.setOnboarded);
  const saveReminder = usePreferences((s) => s.setSundayReminder);
  const startChecklist = useChecklist((s) => s.start);
  const addToCupboard = useCupboard((s) => s.add);
  const addEntry = usePlan((s) => s.addEntry);
  const eatsEverything = useEatsEverything();
  const cupboardPicks = useCupboardPicks();
  const pool = useForYou(POOL);
  // Going back and changing the diet can drop a ticked item from the grid; only what's still offered counts.
  const chosenItems = cupboardPicks.filter((id) => picked.has(id));

  const needsConsent = legal.length > 0 && termsAcceptedAt === undefined;
  /** `note` is said on Home, once the welcome has gone, so it never covers a button here. */
  const finish = (note: string | undefined = planned) => {
    setOnboarded(true);
    startChecklist();
    if (note) toast({ message: note });
    // Having just said what's in the cupboard, Home opens on What I have even if nothing is fully ready (D-041).
    router.replace(stocked ? { pathname: '/', params: { show: 'pantry' } } : '/');
  };
  const go = (from: WelcomeStep, note?: string) => {
    const to = nextStep(from, options);
    if (to === 'done') finish(note ?? planned);
    else setStep(to);
  };
  const leaveHello = (then: () => void) => {
    if (needsConsent) acceptTerms(Date.now());
    then();
  };

  const shown = pool.slice(offset, offset + SHOWN);
  const chosen: Recipe | undefined = shown.find((r) => r.id === chosenId) ?? shown[0];
  const cookTonight = () => {
    if (!chosen) return go('reveal');
    addEntry(chosen.id, toISODate(new Date()), 'dinner', chosen.servings);
    const note = `${chosen.title} is on for tonight`;
    setPlanned(note);
    go('reveal', note);
  };
  const stockCupboard = () => {
    if (chosenItems.length) {
      addToCupboard(chosenItems, 'manual');
      setStocked(true);
    }
    go('cupboard');
  };
  const allow = async () => {
    setBusy(true);
    const on = await setSundayReminder(true);
    saveReminder(on);
    setBusy(false);
    finish(on ? planned : 'Notifications are off for The Pantry. You can turn them on in Settings.');
  };
  const toggleItem = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (step === 'hello') {
    return (
      <HelloStep
        onStart={() => leaveHello(() => go('hello'))}
        onSkip={() => leaveHello(finish)}
        consent={needsConsent ? { links: legal, ticked, onToggle: () => setTicked((t) => !t) } : undefined}
      />
    );
  }
  if (step === 'notify') return <NotifyStep busy={busy} onAllow={() => void allow()} onLater={() => finish()} />;

  const back = previousStep(step);
  const backButton = back ? <TextButton label="Back" onPress={() => setStep(back)} testID="welcome-back" /> : null;
  const main = (label: string, onPress: () => void) => (
    <>
      {backButton}
      <WhitePill label={label} onPress={onPress} testID="welcome-next" />
    </>
  );

  if (step === 'reveal') {
    return (
      <QuizFrame
        progress={stepProgress(step, options)}
        scrim="reveal"
        onSkip={() => finish()}
        footer={chosen ? main('Cook this tonight', cookTonight) : backButton}
      >
        {chosen ? (
          <RevealBody
            picks={shown}
            chosen={chosen}
            canSpin={pool.length > SHOWN}
            onChoose={(r) => setChosenId(r.id)}
            onSpin={() => setOffset((o) => (o + SHOWN < pool.length ? o + SHOWN : 0))}
            onNotTonight={() => go('reveal')}
          />
        ) : (
          <RevealEmpty onChange={() => setStep('eat')} />
        )}
      </QuizFrame>
    );
  }

  const isCupboard = step === 'cupboard';
  const label = step === 'eat' && eatsEverything ? 'None of these' : isCupboard ? 'See my dinners' : 'Continue';
  return (
    <QuizFrame
      progress={stepProgress(step, options)}
      onSkip={() => finish()}
      note={isCupboard && cupboardPicks.length ? pickedLabel(chosenItems.length) : undefined}
      footer={main(label, isCupboard ? stockCupboard : () => go(step))}
    >
      {step === 'intent' ? <IntentStep /> : null}
      {step === 'eat' ? <EatStep /> : null}
      {step === 'cuisines' ? <CuisineStep /> : null}
      {step === 'time' ? <TimeStep /> : null}
      {isCupboard ? <CupboardStep picks={cupboardPicks} picked={picked} onToggle={toggleItem} onSkip={() => go('cupboard')} /> : null}
    </QuizFrame>
  );
}
