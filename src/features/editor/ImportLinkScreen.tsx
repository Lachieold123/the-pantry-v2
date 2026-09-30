// Import a recipe from a web page. The phone fetches the page itself; the
// recipe then opens in the editor to check before saving.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { extractRecipe, normaliseLink } from '@/domain/recipes/importLink';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { usePendingImport } from './pendingImport';
import { goBack } from '@/lib/navigation';

const TIMEOUT_MS = 15_000;

type Failure = 'bad-link' | 'unreachable' | 'no-recipe';
const MESSAGES: Record<Failure, string> = {
  'bad-link': 'That doesn’t look like a web link. It should start with https://',
  unreachable: 'We couldn’t reach that page. Check you’re online, or the site may be blocking apps.',
  'no-recipe': 'We couldn’t find a recipe on that page. Some sites hide theirs.',
};

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export function ImportLinkScreen() {
  const router = useRouter();
  const setPending = usePendingImport((s) => s.set);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>();

  const run = async () => {
    const url = normaliseLink(link);
    if (!url) return setFailure('bad-link');
    setFailure(undefined);
    setBusy(true);
    let html: string;
    try {
      html = await fetchPage(url);
    } catch {
      setBusy(false);
      return setFailure('unreachable');
    }
    setBusy(false);
    const draft = extractRecipe(html);
    if (!draft) return setFailure('no-recipe');
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
