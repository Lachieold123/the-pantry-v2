// Settings → Account (D-043), the first section. Signed out: one row, "Back
// up your kitchen", which opens the sign-in sheet. Signed in: who you are,
// how the backup is going, and Sign out, confirmed on the page (no system
// alert), and refused with a plain reason while changes are still waiting.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { backupLine } from '@/domain/account/account';
import type { Account } from '@/lib/account';
import { useAccount } from '@/store/account';
import { signOut } from '@/store/accountActions';
import { useToast } from '@/ui/patterns/Toast';
import { Avatar } from '@/ui/primitives/Avatar';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { ListRow } from '@/ui/primitives/ListRow';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { ACCOUNT, SETTINGS } from '@/ui/tokens/screens';
import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { accountProblemWords } from './accountWords';
import { SettingsSection } from './SettingsParts';

export function AccountSection() {
  const router = useRouter();
  const who = useAccount((s) => s.who);
  if (who) return <SignedIn who={who} />;
  return (
    <SettingsSection label="Account" testID="settings-account">
      <ListRow
        icon="person"
        title="Back up your kitchen"
        detail="Keep everything if you change phones. No password."
        onPress={() => router.push('/account')}
        testID="settings-account-backup"
      />
    </SettingsSection>
  );
}

/** The time, refreshed each minute, so "5 min ago" stays true while Settings is open. */
function useMinute(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function SignedIn({ who }: { who: Account }) {
  const styles = useStyles();
  const toast = useToast();
  const now = useMinute();
  const sync = useAccount((s) => s.sync);
  const waiting = useAccount((s) => Object.keys(s.pending).length);
  const lastSyncedAt = useAccount((s) => s.lastSyncedAt);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const line = backupLine({ lastSyncedAt, waiting, offline: sync === 'offline', now });
  const backedUp = line.startsWith('Backed up');
  const title = who.name ?? who.email ?? 'Your account';
  const detail = who.apple ? 'Signed in with Apple' : who.name ? who.email : undefined;

  const goodbye = async () => {
    setBusy(true);
    setProblem(undefined);
    const r = await signOut();
    setBusy(false);
    if (!r.ok) return setProblem(accountProblemWords(r.problem));
    toast({ message: 'Signed out. Everything is still in your account.' });
  };

  return (
    <SettingsSection label="Account" testID="settings-account">
      <View style={styles.row} accessible accessibilityLabel={detail ? `${title}, ${detail}` : title} testID="settings-account-who">
        <Avatar name={who.name ?? who.email} size={ACCOUNT.avatar} />
        <View style={styles.text}>
          <Text variant="rowSmall" numberOfLines={1} ellipsizeMode="middle">
            {title}
          </Text>
          {detail ? (
            <Text variant="caption" numberOfLines={1} ellipsizeMode="middle">
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.row} accessible accessibilityLiveRegion="polite" testID="settings-account-backed-up">
        <Icon name={backedUp ? 'checkCircle' : 'refresh'} size={SETTINGS.icon} colour={backedUp ? 'ink' : 'inkMuted'} />
        <Text variant="rowSmall" style={styles.text}>
          {line}
        </Text>
      </View>
      {confirming ? (
        <View style={styles.confirm}>
          <Text variant="bodySmall" colour="inkSoft">
            Sign out of this phone? Everything is in your account, so this phone goes back to a fresh start and nothing is lost.
          </Text>
          {problem ? (
            <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="settings-sign-out-problem">
              {problem}
            </Text>
          ) : null}
          <Button label="Sign out" kind="destructive" block busy={busy} onPress={() => void goodbye()} testID="settings-sign-out-confirm" />
          <Button label="Cancel" kind="quiet" disabled={busy} onPress={() => setConfirming(false)} testID="settings-sign-out-cancel" />
        </View>
      ) : (
        <ListRow icon="logOut" title="Sign out" onPress={() => setConfirming(true)} testID="settings-sign-out" />
      )}
    </SettingsSection>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: TAP_TARGET, paddingVertical: SETTINGS.buttonPadY },
  text: { flex: 1, minWidth: 0, gap: SPACE.xxs / 2 },
  confirm: { gap: SPACE.sm, paddingVertical: SETTINGS.buttonPadY },
}));
