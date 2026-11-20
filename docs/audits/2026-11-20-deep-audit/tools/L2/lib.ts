// Shared L2 helpers: open the web build on :4412 at iPhone size with seeded storage.
import { chromium, type Browser, type Page } from '@playwright/test';

export const BASE = 'http://localhost:4412';
const PREFIX = 'the-pantry-v2';
export const VERSIONS: Record<string, number> = {
  preferences: 4, plan: 1, cupboard: 2, saved: 1, tour: 1, pro: 1, household: 1, 'my-recipes': 1, 'cook-log': 1,
};
export const ONBOARDED = {
  preferences: { onboarded: true, appearance: 'system', diet: 'everything' },
  tour: { seen: true },
};
export const EVIDENCE = 'docs/audits/2026-11-20-deep-audit/evidence/L2/';

let browser: Browser | undefined;
export async function openApp(path: string, seed: Record<string, unknown> = {}, opts: { dark?: boolean; versions?: Record<string, number> } = {}): Promise<{ page: Page; errors: string[] }> {
  browser ??= await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: opts.dark ? 'dark' : 'light', hasTouch: true });
  // Live Supabase must never be written from this audit: abort every request to it.
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const v = { ...VERSIONS, ...(opts.versions ?? {}) };
  await page.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    for (const [k, val] of entries) localStorage.setItem(k, val);
  }, Object.entries(seed).map(([k, s]): [string, string] => [`${PREFIX}/${k}`, JSON.stringify({ state: s, version: v[k] ?? 1 })]));
  await page.goto(BASE + path);
  await page.waitForTimeout(1200);
  return { page, errors };
}
export async function shot(page: Page, name: string) {
  await page.screenshot({ path: EVIDENCE + name + '.png' });
}
export async function done() { await browser?.close(); }
export async function store(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem('the-pantry-v2/' + k), key);
}
export async function visibleText(page: Page, testId: string) {
  return page.getByTestId(testId).first().innerText().catch(() => '<missing>');
}
