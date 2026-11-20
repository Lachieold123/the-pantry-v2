// Import from a link never reads a huge or non-page answer, and can be cancelled (SEC-18, BUG-25).
import { fetchPage, MAX_PAGE_BYTES } from './fetchPage';

const answer = (body: string, headers: Record<string, string> = { 'content-type': 'text/html' }) =>
  ({ ok: true, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => body }) as unknown as Response;

afterEach(() => jest.restoreAllMocks());

it('reads a normal page', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(answer('<html>hi</html>'));
  expect(await fetchPage('https://x.test')).toEqual({ ok: true, html: '<html>hi</html>' });
});

it('refuses a page that says it is too big, or turns out to be', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(answer('', { 'content-type': 'text/html', 'content-length': String(MAX_PAGE_BYTES + 1) }));
  expect(await fetchPage('https://x.test')).toEqual({ ok: false, problem: 'too-big' });
  jest.spyOn(global, 'fetch').mockResolvedValue(answer('x'.repeat(MAX_PAGE_BYTES + 1)));
  expect(await fetchPage('https://x.test')).toEqual({ ok: false, problem: 'too-big' });
});

it('stops reading a page with no length once it passes the cap (S2-12)', async () => {
  const chunk = new Uint8Array(1024 * 1024);
  let reads = 0;
  const body = {
    getReader: () => ({ read: async () => (reads++ < 6 ? { done: false, value: chunk } : { done: true, value: undefined }) }),
  };
  const text = jest.fn(async () => 'x');
  jest.spyOn(global, 'fetch').mockResolvedValue({ ...answer(''), body, text } as unknown as Response);
  expect(await fetchPage('https://x.test')).toEqual({ ok: false, problem: 'too-big' });
  expect(reads).toBe(6); // the sixth megabyte passed 5 MB: no more was read
  expect(text).not.toHaveBeenCalled();
});

it('refuses something that is not a web page', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(answer('…', { 'content-type': 'video/mp4' }));
  expect(await fetchPage('https://x.test')).toEqual({ ok: false, problem: 'not-a-page' });
});

it('says cancelled when the sheet closes mid-fetch', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(
    (_u, init) =>
      new Promise((_r, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  );
  const controller = new AbortController();
  const result = fetchPage('https://x.test', controller.signal);
  controller.abort();
  expect(await result).toEqual({ ok: false, problem: 'cancelled' });
});
