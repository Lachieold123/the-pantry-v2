// First launch: welcome → two taste questions → "Tonight, for you" → an
// optional Sunday reminder. Skippable at every step; a useful screen within
// five taps (PRODUCT §4.12). The look is v1's onboarding (spec §4.21); v1's
// 13+ / Terms consent is left out until there are real terms to agree to.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { toISODate } from '@/domain/plan/week';
import { setSundayReminder } from '@/lib/notifications';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useForYou } from '@/store/suggestions';
import { useToast } from '@/ui/patterns/Toast';
import { RevealBody, RevealEmpty, ReminderStep } from './RevealSteps';
import { EatStep, LikeStep } from './TasteSteps';
import { TextButton, WhitePill } from './OnVideo';
import { HelloStep, QuizFrame } from './WelcomeFrame';

type Step = 'hello' | 'eat' | 'like' | 'reveal' | 'reminder';
const NEXT: Record<Step, Step | 'done'> = { hello: 'eat', eat: 'like', like: 'reveal', reveal: 'reminder', reminder: 'done' };
const BACK: Partial<Record<Step, Step>> = { eat: 'hello', like: 'eat', reveal: 'like' };
/** How far through the bar is on each question page; the reminder is the fourth. */
const PROGRESS: Partial<Record<Step, number>> = { eat: 1 / 4, like: 2 / 4, reveal: 3 / 4 };
const PICKS = 3;

export function WelcomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>('hello');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const setOnboarded = usePreferences((s) => s.setOnboarded);
  const setReminderPref = usePreferences((s) => s.setSundayReminder);
  const addEntry = usePlan((s) => s.addEntry);
  const picks = useForYou(PICKS * 3);

  const finish = () => {
    setOnboarded(true);
    router.replace('/');
  };
  const next = () => {
    const to = NEXT[step];
    if (to === 'done') finish();
    else setStep(to);
  };
  const back = BACK[step];

  const shown = picks.slice(offset, offset + PICKS);
  const [hero, ...more] = shown.length ? shown : picks.slice(0, PICKS);

  const planTonight = () => {
    if (!hero) return next();
    addEntry(hero.id, toISODate(new Date()), 'dinner', hero.servings);
    toast({ message: `${hero.title} is on for tonight` });
    next();
  };
  const remind = async () => {
    setBusy(true);
    const on = await setSundayReminder(true);
    setReminderPref(on);
    setBusy(false);
    if (!on) toast({ message: 'Notifications are off for The Pantry. You can turn them on in Settings.' });
    finish();
  };

  if (step === 'hello') return <HelloStep onStart={next} onSkip={finish} />;
  if (step === 'reminder') return <ReminderStep busy={busy} onRemind={() => void remind()} onNotNow={finish} />;

  const backButton = back ? <TextButton label="Back" onPress={() => setStep(back)} testID="welcome-back" /> : null;
  const footer =
    step === 'reveal' ? (
      hero ? (
        <>
          {backButton}
          <WhitePill label="Cook this tonight" onPress={planTonight} testID="welcome-cook-tonight" />
        </>
      ) : (
        backButton
      )
    ) : (
      <>
        {backButton}
        <WhitePill label={step === 'like' ? 'See my dinners' : 'Continue'} onPress={next} testID="welcome-next" />
      </>
    );

  return (
    <QuizFrame progress={PROGRESS[step] ?? 0} scrim={step === 'reveal' ? 'reveal' : 'quiz'} onSkip={finish} footer={footer}>
      {step === 'eat' ? <EatStep /> : null}
      {step === 'like' ? <LikeStep /> : null}
      {step === 'reveal' ? (
        hero ? (
          <RevealBody
            hero={hero}
            more={more}
            canShowOthers={picks.length > PICKS}
            onPlanTonight={planTonight}
            onPick={(r) => setOffset(picks.indexOf(r))}
            onShowOthers={() => setOffset((o) => (o + PICKS < picks.length ? o + PICKS : 0))}
            onNotTonight={next}
          />
        ) : (
          <RevealEmpty onChange={() => setStep('eat')} />
        )
      ) : null}
    </QuizFrame>
  );
}
