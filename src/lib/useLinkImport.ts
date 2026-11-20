// Reading a recipe from a web link, shared by My recipes' "Import" row (v1's
// layout) and the import sheet. The phone fetches the page itself and reads
// the recipe the site embeds for search engines (D-022); the caller decides
// where the found recipe goes next (the editor, to check before saving).
import { useEffect, useRef, useState } from 'react';

import { extractRecipe, normaliseLink } from '@/domain/recipes/importLink';
import type { RecipeDraft } from '@/domain/recipes/draft';
import { fetchPage } from './fetchPage';

export type LinkImportFailure = 'bad-link' | 'unreachable' | 'no-recipe' | 'not-a-page' | 'too-big';

export const LINK_IMPORT_MESSAGES: Record<LinkImportFailure, string> = {
  'bad-link': 'That doesn’t look like a web link. It should start with https://',
  unreachable: 'We couldn’t reach that page. Check you’re online, or the site may be blocking apps.',
  'no-recipe': 'We couldn’t find a recipe on that page. Some sites hide theirs.',
  'not-a-page': 'That link isn’t a web page. Try the link to the recipe itself.',
  'too-big': 'That page is too big to read. Try the link to the recipe itself.',
};

/** Failures where typing the recipe in is the sensible next step. */
export const writeByHandHelps = (failure: LinkImportFailure | undefined) => failure === 'unreachable' || failure === 'no-recipe';

export function useLinkImport(onFound: (draft: RecipeDraft, url: string) => void) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<LinkImportFailure | undefined>();

  // Leaving mid-fetch cancels it, so a slow page can't jump to the editor later (BUG-25).
  const fetching = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => fetching.current?.abort(), []);

  const run = async (link: string) => {
    if (busy) return;
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
    let draft: RecipeDraft | undefined;
    try {
      draft = extractRecipe(page.html);
    } catch {
      draft = undefined;
    }
    if (!draft) return setFailure('no-recipe');
    onFound(draft, url);
  };

  return {
    busy,
    failure,
    message: failure ? LINK_IMPORT_MESSAGES[failure] : undefined,
    run: (link: string) => void run(link),
    clear: () => setFailure(undefined),
  };
}
