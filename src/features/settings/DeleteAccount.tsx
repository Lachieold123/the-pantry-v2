// Delete account (D-043), at the foot of Settings while signed in. Apple
// requires it in any app with sign-up. It can't be undone, so it asks for
// DELETE to be typed first, on the page, where a test can reach it.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAccount } from '@/store/account';
import { deleteAccount } from '@/store/accountActions';
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
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  if (!signedIn) return null;
  if (!open) return <CardButton icon="trash" label="Delete account" onPress={() => setOpen(true)} testID="settings-delete-account" />;

  const remove = async () => {
    setBusy(true);
    setProblem(undefined);
    const r = await deleteAccount();
    setBusy(false);
    if (!r.ok) return setProblem(accountProblemWords(r.problem));
    toast({ message: 'Your account is deleted.' });
    router.dismissTo('/');
  };

  return (
    <View style={styles.card} testID="settings-delete-panel">
      <Text variant="rowSmall">Delete your account?</Text>
      <Text variant="bodySmall" colour="inkSoft">
        This deletes your account and everything kept in it: your plan, list, cupboard, Cookmarks, collections, recipes and cooking history.
        You’ll leave your household, and this phone goes back to a fresh start. It can’t be undone.
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
        label="Delete account"
        kind="destructive"
        block
        busy={busy}
        disabled={typed.trim().toUpperCase() !== WORD}
        onPress={() => void remove()}
        testID="settings-delete-confirm"
      />
      <Button
        label="Keep my account"
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
