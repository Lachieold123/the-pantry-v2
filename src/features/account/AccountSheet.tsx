// The sign-in sheet (D-043), the same wherever it's offered: Settings' "Back
// up your kitchen", or once at a moment that earns it (a household, the 10th
// Cookmark, your first recipe), worded for that moment. Continue with Apple
// (iPhone only), Continue with email (once email codes are connected:
// lib/emailCodes), or Not now. Nothing is asked twice: "Not now" just closes,
// and the moment never offers again. Where there's no way in yet (the web or
// Android before email codes), the sheet says so plainly and only closes.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { isMoment } from '@/domain/account/account';
import { goBack } from '@/lib/navigation';
import { useAccount } from '@/store/account';
import { signInWithApple } from '@/store/accountActions';
import { useSignInWays } from '@/store/signInWays';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { ACCOUNT } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { AppleButton } from './AppleButton';
import { NO_PASSWORD, NO_WAY_IN, PITCH, PROBLEM_WORDS, SIGNED_IN_TOAST } from './words';

/** `moment` is the route's parameter: what earned the offer, if anything. */
export function AccountSheet({ moment }: { moment?: string | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const ways = useSignInWays();
  const who = useAccount((s) => s.who);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  // iOS doesn't read live regions, so a problem is spoken out loud too.
  useAnnounce(problem);
  const pitch = PITCH[isMoment(moment) ? moment : 'settings'];
  const close = () => goBack(router);

  const withApple = async () => {
    setBusy(true);
    setProblem(undefined);
    const r = await signInWithApple();
    setBusy(false);
    // Closing Apple's sheet is a choice, not a problem: nothing to say.
    if (!r.ok) return r.problem === 'cancelled' ? undefined : setProblem(PROBLEM_WORDS[r.problem]);
    toast({ message: SIGNED_IN_TOAST });
    close();
  };

  if (who) {
    // Reached from an old link after signing in: say so rather than offer it again.
    return (
      <Sheet title="You’re signed in" kicker="Your account" onClose={close}>
        <Text variant="body" colour="inkSoft">
          Your kitchen is backed up to your account. Settings shows how it’s going.
        </Text>
        <Button label="Done" kind="primary" block onPress={close} testID="account-done" />
      </Sheet>
    );
  }

  if (ways.apple === false && !ways.email) {
    // No button that leads nowhere: say where backing up works, and close.
    return (
      <Sheet title={pitch.title} kicker="Your account" onClose={close}>
        <Text variant="body" colour="inkSoft" testID="account-unavailable">
          {NO_WAY_IN}
        </Text>
        <Button label="Done" kind="primary" block onPress={close} testID="account-done" />
      </Sheet>
    );
  }

  return (
    <Sheet title={pitch.title} kicker="Your account" onClose={close}>
      <Text variant="body" colour="inkSoft" testID="account-pitch">
        {pitch.line}
      </Text>
      <View style={{ gap: SPACE.sm }}>
        {ways.apple ? (
          <AppleButton busy={busy} onPress={() => void withApple()} />
        ) : ways.apple === undefined ? (
          // Still asking the phone: hold Apple's space so nothing jumps when the button arrives.
          <View style={{ height: ACCOUNT.appleHeight }} testID="account-apple-pending" />
        ) : null}
        {ways.email ? (
          <Button
            label="Continue with email"
            icon="mail"
            kind={ways.apple ? 'secondary' : 'primary'}
            size="lg"
            block
            disabled={busy}
            onPress={() => router.replace('/account/email')}
            testID="account-email"
          />
        ) : null}
      </View>
      {problem ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="account-problem">
          {problem}
        </Text>
      ) : null}
      <Text variant="caption" align="center">
        {NO_PASSWORD}
      </Text>
      <View style={{ alignItems: 'center' }}>
        <Button label="Not now" kind="quiet" disabled={busy} onPress={close} testID="account-not-now" />
      </View>
    </Sheet>
  );
}
