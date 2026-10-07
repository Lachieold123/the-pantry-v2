// The code step (D-043): the 6 digits from the email. The phone offers the
// code from Mail above the keyboard (one-time-code autofill), and six digits
// sign in by themselves. A new code can be sent after a minute; "Change
// email" goes back a step for a typo'd address, which never gets a code.
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { cleanCode, CODE_LENGTH, resendIn } from '@/domain/account/account';
import { useAccount, type SentCode } from '@/store/account';
import { forgetCode, sendCode, verifyCode } from '@/store/accountActions';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { ACCOUNT } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PROBLEM_WORDS, SIGNED_IN_TOAST } from './words';

/** Seconds left before a new code can be sent, ticking down once a second. */
function useResendIn(sentAt: number): number {
  const [now, setNow] = useState(Date.now);
  const left = resendIn(sentAt, now);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), ACCOUNT.tick);
    return () => clearTimeout(timer);
  }, [left, now]);
  return left;
}

export function CodeStep({ sent, onDone }: { sent: SentCode; onDone: () => void }) {
  const toast = useToast();
  const signingIn = useAccount((s) => s.status === 'signing-in');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'verify' | 'resend' | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  // iOS doesn't read live regions, so a problem is spoken out loud too.
  useAnnounce(problem);
  const left = useResendIn(sent.sentAt);
  const tried = useRef('');

  const verify = async (typed: string) => {
    if (typed.length < CODE_LENGTH || busy) return;
    tried.current = typed;
    setBusy('verify');
    setProblem(undefined);
    const r = await verifyCode(typed);
    setBusy(undefined);
    if (!r.ok) return setProblem(PROBLEM_WORDS[r.problem]);
    toast({ message: SIGNED_IN_TOAST });
    onDone();
  };
  const resend = async () => {
    setBusy('resend');
    setProblem(undefined);
    const r = await sendCode(sent.email);
    setBusy(undefined);
    if (!r.ok) return setProblem(PROBLEM_WORDS[r.problem]);
    setCode('');
    toast({ message: `New code sent to ${sent.email}` });
  };
  const onType = (t: string) => {
    const digits = cleanCode(t);
    setCode(digits);
    setProblem(undefined);
    // Six digits (typed, pasted or autofilled) sign in at once; the same wrong six aren't sent twice.
    if (digits.length === CODE_LENGTH && digits !== tried.current) void verify(digits);
  };

  return (
    <>
      <Text variant="body" colour="inkSoft" testID="account-code-sent">
        {`We sent a 6-digit code to ${sent.email}. It can take a minute to arrive.`}
      </Text>
      <TextField
        label="Code"
        value={code}
        onChangeText={onType}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={CODE_LENGTH + 2}
        returnKeyType="done"
        onSubmitEditing={() => void verify(code)}
        testID="account-code"
      />
      {problem ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="account-code-problem">
          {problem}
        </Text>
      ) : null}
      <Button
        label="Sign in"
        kind="primary"
        size="lg"
        block
        busy={busy === 'verify' || signingIn}
        disabled={code.length < CODE_LENGTH || busy !== undefined}
        onPress={() => void verify(code)}
        testID="account-verify"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACE.xs }}>
        <Button
          label={left > 0 ? `Send a new code in ${left}s` : 'Send a new code'}
          kind="quiet"
          busy={busy === 'resend'}
          disabled={left > 0 || busy !== undefined}
          onPress={() => void resend()}
          testID="account-resend"
        />
        <Button label="Change email" kind="quiet" disabled={busy !== undefined} onPress={forgetCode} testID="account-change-email" />
      </View>
    </>
  );
}
