// Continue with email (D-043): type your email, get a 6-digit code, type it
// in. Works everywhere, including Android and the web. The code that was
// sent is kept by the store, so checking the Mail app and coming back (even
// after the app was closed) lands on the code step, not the start.
// Until email codes are connected (lib/emailCodes) nothing links here; an old
// link gets a calm "coming soon" and a way out, never a form that can't send.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { EMAIL_CODES_CONNECTED } from '@/lib/emailCodes';
import { goBack } from '@/lib/navigation';
import { useAccount } from '@/store/account';
import { sendCode } from '@/store/accountActions';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { CodeStep } from './CodeStep';
import { APPLE_ON_IPHONE, NO_PASSWORD, PROBLEM_WORDS } from './words';

export function EmailSheet() {
  const router = useRouter();
  const sent = useAccount((s) => s.code);
  if (!EMAIL_CODES_CONNECTED) {
    return (
      <Sheet title="Email sign-in is coming soon" kicker="Your account" onClose={() => goBack(router)}>
        <Text variant="body" colour="inkSoft" testID="account-email-soon">
          {`${APPLE_ON_IPHONE} Everything keeps working without an account.`}
        </Text>
        <Button label="Done" kind="primary" block onPress={() => goBack(router)} testID="account-done" />
      </Sheet>
    );
  }
  return (
    <Sheet title={sent ? 'Check your email' : 'Continue with email'} kicker="Your account" onClose={() => goBack(router)}>
      {sent ? <CodeStep sent={sent} onDone={() => goBack(router)} /> : <EmailStep />}
    </Sheet>
  );
}

function EmailStep() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  // iOS doesn't read live regions, so a problem is spoken out loud too.
  useAnnounce(problem);
  const ready = email.trim().length > 0 && !busy;

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setProblem(undefined);
    const r = await sendCode(email);
    setBusy(false);
    // On success the store keeps the code, and the sheet moves to the code step by itself.
    if (!r.ok) setProblem(PROBLEM_WORDS[r.problem]);
  };

  return (
    <>
      <Text variant="body" colour="inkSoft">
        We’ll email you a 6-digit code. Type it in and you’re signed in.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setProblem(undefined);
        }}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="send"
        onSubmitEditing={() => void send()}
        maxLength={254}
        testID="account-email-field"
      />
      {problem ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="account-problem">
          {problem}
        </Text>
      ) : null}
      <Button
        label="Send code"
        kind="primary"
        size="lg"
        block
        busy={busy}
        disabled={!ready}
        onPress={() => void send()}
        testID="account-send"
      />
      <Text variant="caption" align="center">
        {NO_PASSWORD}
      </Text>
    </>
  );
}
