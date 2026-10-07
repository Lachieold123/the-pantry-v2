// Opened from an invite link (thepantry://join/CODE, D-039): one question,
// your name, then you're in. If this phone already shares a kitchen, it says
// so instead of quietly switching.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { joinWithCode, useHousehold } from '@/store/household';
import { goBack } from '@/lib/navigation';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { PROBLEM_WORDS } from './words';

export function JoinScreen({ code }: { code: string }) {
  const router = useRouter();
  const toast = useToast();
  const current = useHousehold((s) => s.household);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  useAnnounce(problem);
  const clean = code.trim().toUpperCase();

  const join = async () => {
    setBusy(true);
    setProblem(undefined);
    const joined = await joinWithCode(clean, name.trim());
    setBusy(false);
    if (!joined.ok) return setProblem(PROBLEM_WORDS[joined.problem]);
    toast({ message: `You’ve joined ${joined.value.name}. Your plan, list and cupboard are shared now.` });
    router.replace('/list');
  };

  return (
    <Sheet title="Join a kitchen" kicker={`Invite ${clean}`} onClose={() => goBack(router)}>
      {current ? (
        <View style={{ gap: SPACE.md }}>
          <Text variant="body" colour="inkSoft">
            {`This phone already shares ${current.name}. To join another, leave it first in Settings → Household.`}
          </Text>
          <Button label="Open Household" kind="primary" block onPress={() => router.replace('/household')} testID="join-open-household" />
        </View>
      ) : (
        <View style={{ gap: SPACE.lg }}>
          <Text variant="body" colour="inkSoft">
            You’ll share the week’s plan, the shopping list and the cupboard. Anything already planned or in your cupboard comes along too.
          </Text>
          <TextField
            label="Your name"
            hint="So the others know who ticked what"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoCapitalize="words"
            testID="join-name"
          />
          <Button
            label="Join"
            kind="primary"
            block
            busy={busy}
            disabled={!name.trim() || busy}
            onPress={() => void join()}
            testID="join-confirm"
          />
          {problem ? (
            <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="join-problem">
              {problem}
            </Text>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}
