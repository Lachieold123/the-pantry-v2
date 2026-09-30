// Import a recipe from a web page. The phone fetches the page itself; the
// recipe then opens in the editor to check before saving.
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import type { RecipeDraft } from '@/domain/recipes/draft';
import { extractRecipe, MAX_PAGE_CHARS, normaliseLink } from '@/domain/recipes/importLink';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { usePendingImport } from './pendingImport';

const TIMEOUT_MS = 15_000;

type Failure = 'bad-link' | 'unreachable' | 'no-recipe' | 'too-big';
const MESSAGES: Record<Failure, string> = {
  'bad-link': 'That doesn’t look like a web link. It should start with https://',
  unreachable: 'We couldn’t reach that page. Check you’re online, or the site may be blocking apps.',
  'no-recipe': 'We couldn’t find a recipe on that page. Some sites hide theirs.',
  'too-big': 'That page is too big to read. Try the recipe’s own page, or write it in by hand.',
};

class TooBig extends Error {}

/** The page's HTML. `controller` lets the screen stop it when the sheet closes. */
async function fetchPage(url: string, controller: AbortController): Promise<string> {
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Refuse before downloading when the site says it's huge (the header counts bytes, and a
    // character can take several); extractRecipe also stops reading past its cap.
    if (Number(response.headers.get('content-length') ?? 0) > MAX_PAGE_CHARS * 2) throw new TooBig();
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function readRecipe(html: string): RecipeDraft | undefined {
  try {
    return extractRecipe(html);
  } catch {
    // A page we can't make sense of is the same to the cook as one without a recipe.
    return undefined;
  }
}

export function ImportLinkScreen() {
  const router = useRouter();
  const setPending = usePendingImport((s) => s.set);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>();
  // Refs, not state: the keyboard's Go and the button can both fire before a re-render.
  const running = useRef(false);
  const current = useRef<AbortController | undefined>(undefined);

  // Closing the sheet stops the download, so a late page can't replace whatever screen is showing now.
  useEffect(
    () => () => {
      current.current?.abort();
      current.current = undefined;
    },
    [],
  );

  const run = async () => {
    if (running.current) return;
    const url = normaliseLink(link);
    if (!url) return setFailure('bad-link');
    const controller = new AbortController();
    running.current = true;
    current.current = controller;
    setFailure(undefined);
    setBusy(true);
    let result: RecipeDraft | Failure;
    try {
      const draft = readRecipe(await fetchPage(url, controller));
      result = draft ?? 'no-recipe';
    } catch (error) {
      result = error instanceof TooBig ? 'too-big' : 'unreachable';
    }
    // Only the run still current (sheet open, not superseded) may act on what came back.
    if (current.current !== controller) return;
    running.current = false;
    current.current = undefined;
    setBusy(false);
    if (typeof result === 'string') return setFailure(result);
    setPending({ draft: result, url });
    router.replace({ pathname: '/my-recipe/edit', params: { from: 'import' } });
  };

  return (
    <Sheet title="Import from a link" onClose={() => router.back()}>
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
        editable={!busy}
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
