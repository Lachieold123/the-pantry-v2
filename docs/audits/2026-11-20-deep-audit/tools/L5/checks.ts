// Lane 5: targeted looks. Same network rule as shots.ts (only GET reads on `read` screens).
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/checks.ts
import { chromium, type Page } from 'playwright';

const BASE = 'http://localhost:4415';
const OUT = 'docs/audits/2026-11-20-deep-audit/evidence/L5/shots';
const ONB = { preferences: { onboarded: true, appearance: 'system', diet: 'everything' }, tour: { seen: true } };
const V: Record<string, number> = { preferences: 3, tour: 1 };

async function run(name: string, path: string, read: boolean, act: (p: Page) => Promise<string>) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light' });
  await ctx.route(/supabase\.co/, (r) => (read && r.request().method() === 'GET' && /\/(rest|storage)\/v1\//.test(r.request().url()) ? r.continue() : r.abort('internetdisconnected')));
  await ctx.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    for (const [k, v] of entries) localStorage.setItem(`the-pantry-v2/${k}`, v);
  }, Object.entries(ONB).map(([k, s]): [string, string] => [k, JSON.stringify({ state: s, version: V[k] })]));
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  await page.waitForTimeout(2500);
  const note = await act(page);
  await page.screenshot({ path: `${OUT}/x-${name}-light.png` });
  console.log(name, '=>', note);
  await browser.close();
}

async function main() {
  await run('feed-offline-15s', '/feed', false, async (p) => {
    await p.waitForTimeout(15000);
    return (await p.getByTestId('feed-error').count()) ? 'error shown' : (await p.getByTestId('feed-loading').count()) ? 'STILL SPINNING' : 'other';
  });
  for (const [name, read] of [['home-foryou-online', true], ['home-foryou-offline', false]] as const) {
    await run(name, '/', read, async (p) => {
      await p.waitForTimeout(4000);
      const s = p.getByTestId('home-for-you');
      if (!(await s.count())) return 'no Picked for you section';
      await s.scrollIntoViewIfNeeded();
      await p.waitForTimeout(800);
      return (await s.innerText()).replace(/\s+/g, ' ').slice(0, 400);
    });
  }
}
void main();
