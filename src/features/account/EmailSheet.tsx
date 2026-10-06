// Continue with email (D-043): type your email, get a 6-digit code, type it
// in. Works everywhere, including Android and the web. The code that was
// sent is kept by the store, so checking the Mail app and coming back (even
// after the app was closed) lands on the code step, not the start.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { goBack } from '@/lib/navigation';
import { useAccount } from '@/store/account';
import { sendCode } from '@/store/accountActions';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { CodeStep } from './CodeStep';
import { NO_PASSWORD, PROBLEM_WORDS } from './words';

export function EmailSheet() {
  const router = useRouter();
  const sent = useAccount((s) => s.code);
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
