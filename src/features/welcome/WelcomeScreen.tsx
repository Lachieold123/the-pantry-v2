// First launch: welcome → two taste questions → "Tonight, for you" → an
// optional Sunday reminder. Skippable at every step; a useful screen within
// five taps (PRODUCT §4.12).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { toISODate } from '@/domain/plan/week';
import { setSundayReminder } from '@/lib/notifications';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useForYou } from '@/store/suggestions';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { EatStep, LikeStep } from './TasteSteps';

type Step = 'hello' | 'eat' | 'like' | 'reveal' | 'reminder';
const NEXT: Record<Step, Step | 'done'> = { hello: 'eat', eat: 'like', like: 'reveal', reveal: 'reminder', reminder: 'done' };
const BACK: Partial<Record<Step, Step>> = { eat: 'hello', like: 'eat', reveal: 'like' };
const PICKS = 3;

export function WelcomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>('hello');
  const [offset, setOffset] = useState(0);
  const setOnboarded = usePreferences((s) => s.setOnboarded);
  const setReminderPref = usePreferences((s) => s.setSundayReminder);
  const addEntry = usePlan((s) => s.addEntry);
  const removeEntry = usePlan((s) => s.removeEntry);
  const picks = useForYou(PICKS * 3);

  const finish = () => {
    setOnboarded(true);
    router.replace('/');
  };
  const next = () => {
    const to = NEXT[step];
    if (to === 'done') finish();
    else {
      // Fresh answers deserve their best match first, not the page an old offset left open (audit F166).
      if (to === 'reveal') setOffset(0);
      setStep(to);
    }
  };
  const back = BACK[step];

  const shown = picks.slice(offset, offset + PICKS);
  const [hero, ...more] = shown.length ? shown : picks.slice(0, PICKS);

  const planTonight = () => {
    if (!hero) return next();
    const entry = addEntry(hero.id, toISODate(new Date()), 'dinner', hero.servings);
    toast({ message: `${hero.title} is on for tonight`, undo: () => removeEntry(entry.id) });
    next();
  };
  // Tapping the photo is a look, not a decision: only the button plans it (audit F146).
  const openHero = () => {
    if (hero) router.push({ pathname: '/recipe/[id]', params: { id: hero.id } });
  };
  const remind = async () => {
    const on = await setSundayReminder(true);
    setReminderPref(on);
    if (!on) toast({ message: 'Notifications are off for The Pantry. You can turn them on in Settings.' });
    finish();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        {back ? <Button label="Back" kind="quiet" onPress={() => setStep(back)} testID="welcome-back" /> : <View />}
        {step === 'reminder' ? null : (
          <Button label="Skip" kind="quiet" onPress={finish} accessibilityHint="Go straight to the app" testID="welcome-skip" />
        )}
      </View>

      {step === 'hello' ? (
        <View style={{ gap: SPACE.md, paddingTop: SPACE.xxl }}>
          <Text variant="kicker">Welcome to</Text>
          <Text variant="display" accessibilityRole="header">
            The Pantry
          </Text>
          <Text variant="body" colour="inkSoft">
            Plan the week on Sunday, shop once, and know what’s for dinner every night. A few quick questions and we’ll suggest tonight’s.
          </Text>
          <Button label="Get started" kind="primary" block onPress={next} testID="welcome-start" />
        </View>
      ) : null}

      {step === 'eat' ? <EatStep /> : null}
      {step === 'like' ? <LikeStep /> : null}
      {step === 'eat' || step === 'like' ? <Button label="Next" kind="primary" block onPress={next} testID="welcome-next" /> : null}

      {step === 'reveal' ? (
        hero ? (
          <View style={{ gap: SPACE.md }}>
            <Text variant="kicker">Tonight, for you</Text>
            <RecipeCard recipe={hero} image={RECIPE_IMAGES[hero.id]} size="large" onPress={openHero} testID="welcome-pick" />
            <Button label="Cook this tonight" kind="primary" block onPress={planTonight} testID="welcome-cook-tonight" />
            {more.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                image={RECIPE_IMAGES[r.id]}
                size="row"
                note="Or this"
                onPress={() => setOffset(picks.indexOf(r))}
                testID={`welcome-other-${r.id}`}
              />
            ))}
            {picks.length > PICKS ? (
              <Button
                label="Show me others"
                kind="quiet"
                onPress={() => setOffset((o) => (o + PICKS < picks.length ? o + PICKS : 0))}
                testID="welcome-show-others"
              />
            ) : null}
            <Button label="Not tonight" kind="quiet" onPress={next} testID="welcome-not-tonight" />
          </View>
        ) : (
          <EmptyState
            title="Nothing fits all of that yet"
            body="Your answers rule out every dinner we have. Try loosening what you avoid."
            action={{ label: 'Change answers', onPress: () => setStep('eat') }}
            testID="welcome-empty"
          />
        )
      ) : null}

      {step === 'reminder' ? (
        <View style={{ gap: SPACE.md, paddingTop: SPACE.xl }}>
          <Text variant="title" accessibilityRole="header">
            A nudge on Sundays?
          </Text>
          <Text variant="body" colour="inkSoft">
            We’ll remind you at 4pm on Sunday to plan the week. Nothing else, ever. You can change it in Settings.
          </Text>
          <Button label="Remind me on Sundays" kind="primary" block onPress={() => void remind()} testID="welcome-remind" />
          <Button label="Not now" kind="quiet" onPress={finish} testID="welcome-not-now" />
        </View>
      ) : null}
    </Screen>
  );
}
