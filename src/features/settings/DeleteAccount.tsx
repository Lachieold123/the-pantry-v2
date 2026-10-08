// Delete account (D-043), at the foot of Settings while signed in. Apple
// requires it in any app with sign-up. It can't be undone, so it asks for
// DELETE to be typed first, on the page, where a test can reach it.
//
// A phone that shared a kitchen without an account has a quiet anonymous
// user on the server too. It gets the same panel, as "Delete my household
// data": the server forgets it, and the kitchen stays on this phone.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAccount } from '@/store/account';
import { deleteAccount } from '@/store/accountActions';
import { deleteHouseholdData, useHousehold } from '@/store/household';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { makeStyles } from '@/ui/theme/makeStyles';
import { SETTINGS } from '@/ui/tokens/screens';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { accountProblemWords } from './accountWords';
import { CardButton } from './SettingsParts';

const WORD = 'DELETE';

export function DeleteAccount() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const signedIn = useAccount((s) => s.who !== undefined);
  const householdOnly = useHousehold((s) => s.userId !== undefined) && !signedIn;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  if (!signedIn && !householdOnly) return null;
  const label = signedIn ? 'Delete account' : 'Delete my household data';
  if (!open) return <CardButton icon="trash" label={label} onPress={() => setOpen(true)} testID="settings-delete-account" />;

  const remove = async () => {
    setBusy(true);
    setProblem(undefined);
    const r = signedIn ? await deleteAccount() : await deleteHouseholdData();
    setBusy(false);
    if (!r.ok) return setProblem(accountProblemWords(r.problem === 'unsaved' || r.problem === 'offline' ? r.problem : 'failed'));
    toast({ message: signedIn ? 'Your account is deleted.' : 'Deleted. Your plan, list and cupboard stay on this phone.' });
    router.dismissTo('/');
  };

  return (
    <View style={styles.card} testID="settings-delete-panel">
      <Text variant="rowSmall">{signedIn ? 'Delete your account?' : 'Delete your household data?'}</Text>
      <Text variant="bodySmall" colour="inkSoft">
        {signedIn
          ? 'This deletes your account and everything kept in it: your plan, list, cupboard, Cookmarks, collections, recipes and cooking history. You’ll leave your household, and this phone goes back to a fresh start. It can’t be undone.'
          : 'Sharing a kitchen keeps your name and this phone’s id on our server. This deletes them and anything of yours stored there, and you’ll leave your household. Your plan, list and cupboard stay on this phone. It can’t be undone.'}
      </Text>
      <TextField
        label={`Type ${WORD} to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        testID="settings-delete-confirm-field"
      />
      {problem ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="settings-delete-problem">
          {problem}
        </Text>
      ) : null}
      <Button
        label={signedIn ? 'Delete account' : 'Delete'}
        kind="destructive"
        block
        busy={busy}
        disabled={typed.trim().toUpperCase() !== WORD}
        onPress={() => void remove()}
        testID="settings-delete-confirm"
      />
      <Button
        label={signedIn ? 'Keep my account' : 'Keep it'}
        kind="quiet"
        disabled={busy}
        onPress={() => {
          setOpen(false);
          setTyped('');
          setProblem(undefined);
        }}
        testID="settings-delete-cancel"
      />
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  // The same white card as the sections above it.
  card: { backgroundColor: colours.bg, borderRadius: RADIUS.big, padding: SETTINGS.cardPadX, gap: SPACE.sm },
}));
