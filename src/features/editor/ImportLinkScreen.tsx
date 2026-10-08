// Import a recipe from a web page. The phone fetches the page itself; the
// recipe then opens in the editor to check before saving.
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { extractRecipe, normaliseLink } from '@/domain/recipes/importLink';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { usePendingImport } from './pendingImport';
import { fetchPage } from '@/lib/fetchPage';
import { goBack } from '@/lib/navigation';
import { usePro } from '@/store/pro';

type Failure = 'bad-link' | 'unreachable' | 'no-recipe' | 'not-a-page' | 'too-big';
const MESSAGES: Record<Failure, string> = {
  'bad-link': 'That doesn’t look like a web link. It should start with https://',
  unreachable: 'We couldn’t reach that page. Check you’re online, or the site may be blocking apps.',
  'no-recipe': 'We couldn’t find a recipe on that page. Some sites hide theirs.',
  'not-a-page': 'That link isn’t a web page. Try the link to the recipe itself.',
  'too-big': 'That page is too big to read. Try the link to the recipe itself.',
};

export function ImportLinkScreen() {
  const router = useRouter();
  const setPending = usePendingImport((s) => s.set);
  const recordImport = usePro((s) => s.recordImport);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>();

  // Closing the sheet mid-fetch cancels it, so a slow page can't jump to the editor later (BUG-25).
  const fetching = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => fetching.current?.abort(), []);

  const run = async () => {
    const url = normaliseLink(link);
    if (!url) return setFailure('bad-link');
    setFailure(undefined);
    setBusy(true);
    const controller = new AbortController();
    fetching.current = controller;
    const page = await fetchPage(url, controller.signal);
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!page.ok) return setFailure(page.problem === 'cancelled' ? 'unreachable' : page.problem);
    // A page that trips the reader is a page with no recipe, never a spinner that never ends (BUG-24).
    let draft: ReturnType<typeof extractRecipe>;
    try {
      draft = extractRecipe(page.html);
    } catch {
      draft = undefined;
    }
    if (!draft) return setFailure('no-recipe');
    // Only an import that found a recipe counts towards the free 5 a month.
    recordImport();
    setPending({ draft, url });
    router.replace({ pathname: '/my-recipe/edit', params: { from: 'import' } });
  };

  return (
    <Sheet title="Import from a link" onClose={() => goBack(router)}>
      <Text variant="body" colour="inkSoft">
        Paste a link to a recipe page. You’ll check it over before it’s saved.
      </Text>
      <TextField
        label="Recipe link"
        placeholder="https://"
        value={link}
        onChangeText={(t) => {
          setLink(t);
          setFailure(undefined);
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => void run()}
        error={failure ? MESSAGES[failure] : undefined}
        testID="import-link"
      />
      <View style={{ gap: SPACE.sm }}>
        <Button
          label="Import"
          kind="primary"
          busy={busy}
          disabled={!link.trim() || busy}
          onPress={() => void run()}
          testID="import-submit"
        />
        {failure === 'unreachable' || failure === 'no-recipe' ? (
          <Button label="Write it in by hand" onPress={() => router.replace('/my-recipe/edit')} testID="import-write-by-hand" />
        ) : null}
      </View>
    </Sheet>
  );
}
