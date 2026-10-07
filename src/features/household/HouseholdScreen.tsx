// Household (D-039): share the week's plan, the shopping list and the
// cupboard with the people you cook with. Two states: not sharing yet (start
// a household, or enter a code), and sharing (who's in, how sync is going,
// invite someone, leave). No accounts: your name is the only thing asked.
import { useState } from 'react';
import { View } from 'react-native';

import { shareText } from '@/lib/share';
import { inviteCode, joinWithCode, leave, startHousehold, useHousehold } from '@/store/household';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Avatar } from '@/ui/primitives/Avatar';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { HOUSEHOLD } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { inviteMessage, PROBLEM_WORDS } from './words';

export function HouseholdScreen() {
  const household = useHousehold((s) => s.household);
  return (
    <Screen testID="household-screen">
      <PushedHeader kicker="Household" title={household ? household.name : 'Share your kitchen'} />
      {household ? <Sharing /> : <NotSharing />}
    </Screen>
  );
}

function NotSharing() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'start' | 'join' | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  useAnnounce(problem);
  // Signing in to an account that wasn't in this phone's household (D-043) leaves it behind: say so.
  const rejoin = useHousehold((s) => s.rejoin);
  const trimmed = name.trim();

  const start = async () => {
    setBusy('start');
    setProblem(undefined);
    const made = await startHousehold(trimmed);
    setBusy(undefined);
    if (!made.ok) return setProblem(PROBLEM_WORDS[made.problem]);
    toast({ message: 'You’re sharing. Now invite someone.' });
  };
  const join = async () => {
    setBusy('join');
    setProblem(undefined);
    const joined = await joinWithCode(code, trimmed);
    setBusy(undefined);
    if (!joined.ok) return setProblem(PROBLEM_WORDS[joined.problem]);
    toast({ message: `You’ve joined ${joined.value.name}` });
  };

  return (
    <View style={{ gap: SPACE.lg }}>
      {rejoin ? (
        <Text variant="bodySmall" colour="inkSoft" testID="household-rejoin">
          {`Since you signed in, this phone isn’t in ${rejoin} any more. Your plan, list and cupboard are still here. To share again, ask someone in ${rejoin} for a new invite.`}
        </Text>
      ) : null}
      <Text variant="body" colour="inkSoft">
        Share the week’s plan, the shopping list and the cupboard with the people you cook with. Tick milk at the shops and it’s ticked on
        their phone too. No account, no password.
      </Text>
      <TextField
        label="Your name"
        hint="So the others know who ticked what"
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoCapitalize="words"
        testID="household-name"
      />
      <Button
        label="Start sharing"
        kind="primary"
        block
        busy={busy === 'start'}
        disabled={!trimmed || busy !== undefined}
        onPress={() => void start()}
        testID="household-start"
      />
      <View style={{ gap: SPACE.sm }}>
        <Text variant="kickerSection" accessibilityRole="header">
          Got an invite code?
        </Text>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          testID="household-code"
        />
        <Button
          label="Join"
          kind="secondary"
          block
          busy={busy === 'join'}
          disabled={!trimmed || code.trim().length < 8 || busy !== undefined}
          onPress={() => void join()}
          testID="household-join"
        />
      </View>
      {problem ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="household-problem">
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

function Sharing() {
  const toast = useToast();
  const household = useHousehold((s) => s.household);
  const me = useHousehold((s) => s.userId);
  const status = useHousehold((s) => s.status);
  const waiting = useHousehold((s) => Object.keys(s.pending).length);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!household) return null;

  const invite = async () => {
    setBusy(true);
    const code = await inviteCode();
    setBusy(false);
    if (!code.ok) return toast({ message: PROBLEM_WORDS[code.problem] });
    const sent = await shareText(inviteMessage(code.value), 'Join our kitchen');
    if (sent === 'copied') toast({ message: 'Invite copied. Paste it into a message.' });
  };
  const goodbye = async () => {
    setBusy(true);
    const left = await leave();
    setBusy(false);
    if (!left.ok) return toast({ message: PROBLEM_WORDS[left.problem] });
    toast({ message: 'You’ve left. Your plan, list and cupboard stay on this phone.' });
  };
  const syncLine =
    status === 'offline'
      ? `Offline. ${waiting ? 'Your changes will send' : 'Changes will arrive'} when you’re back online.`
      : waiting || status === 'syncing'
        ? 'Saving…'
        : 'Up to date. Changes show on everyone’s phone in a few seconds.';

  return (
    <View style={{ gap: SPACE.lg }}>
      <Text variant="body" colour="inkSoft">
        Everyone here shares one plan, one shopping list and one cupboard. Cookmarks, collections and your taste settings stay your own.
      </Text>
      <View style={{ gap: SPACE.sm }} testID="household-members">
        {household.members.map((m) => (
          <View key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Avatar name={m.name} size={HOUSEHOLD.avatar} />
            <Text variant="row">{m.userId === me ? `${m.name} (you)` : m.name}</Text>
          </View>
        ))}
      </View>
      <Text variant="caption" accessibilityLiveRegion="polite" testID="household-status">
        {syncLine}
      </Text>
      <Button
        label="Invite someone"
        kind="primary"
        block
        busy={busy}
        disabled={busy}
        onPress={() => void invite()}
        testID="household-invite"
      />
      {confirmLeave ? (
        <View style={{ gap: SPACE.sm }}>
          <Text variant="bodySmall" colour="inkSoft">
            Leave {household.name}? This phone keeps the plan, list and cupboard as they are now, and stops sharing.
          </Text>
          <Button label="Leave" kind="destructive" block disabled={busy} onPress={() => void goodbye()} testID="household-leave-confirm" />
          <Button label="Stay" kind="quiet" onPress={() => setConfirmLeave(false)} testID="household-leave-cancel" />
        </View>
      ) : (
        <Button label="Leave household" kind="quiet" onPress={() => setConfirmLeave(true)} testID="household-leave" />
      )}
    </View>
  );
}
