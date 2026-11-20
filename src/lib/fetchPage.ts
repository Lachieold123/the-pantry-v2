// Fetching a recipe page for "Import from a link". The phone fetches the page
// itself. A hostile or broken link must not hang the app or fill its memory
// (SEC-18): pages are capped in size, must be web pages, and the fetch can be
// cancelled when the sheet closes (BUG-25).

const TIMEOUT_MS = 15_000;
/** Far more than any real recipe page; a bigger answer is something else. */
export const MAX_PAGE_BYTES = 5 * 1024 * 1024;

export type PageFailure = 'unreachable' | 'not-a-page' | 'too-big' | 'cancelled';
export type PageResult = { ok: true; html: string } | { ok: false; problem: PageFailure };

const WEB_PAGE = /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i;

/**
 * The body as text, or undefined once it passes the cap: reading stops there, so a page
 * with no length header can't fill the memory first (S2-12). Where the fetch has no
 * readable stream (React Native's own fetch), it falls back to reading the whole text.
 */
async function readCapped(response: Response, controller: AbortController): Promise<string | undefined> {
  const reader = response.body?.getReader?.();
  if (!reader || typeof TextDecoder === 'undefined') return response.text();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return html + decoder.decode();
    bytes += value.byteLength;
    if (bytes > MAX_PAGE_BYTES) {
      controller.abort();
      return undefined;
    }
    html += decoder.decode(value, { stream: true });
  }
}

/** Fetches a page; `signal` cancels it (the sheet closing). Never throws. */
export async function fetchPage(url: string, signal?: AbortSignal): Promise<PageResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
    if (!response.ok) return { ok: false, problem: 'unreachable' };
    const type = response.headers.get('content-type');
    if (type && !WEB_PAGE.test(type)) return { ok: false, problem: 'not-a-page' };
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_PAGE_BYTES) return { ok: false, problem: 'too-big' };
    const html = await readCapped(response, controller);
    if (html === undefined || html.length > MAX_PAGE_BYTES) return { ok: false, problem: 'too-big' };
    return { ok: true, html };
  } catch {
    return { ok: false, problem: signal?.aborted ? 'cancelled' : 'unreachable' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
