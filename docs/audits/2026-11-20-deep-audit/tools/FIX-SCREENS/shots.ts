// Screens fixer: light and dark shots at 390 x 844 of every screen the fixes changed.
// Same seeding and network rule as L5/shots.ts: every supabase.co call is aborted,
// so nothing signs in, joins or writes. Expects a store-like web export served on :4416.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/FIX-SCREENS/shots.ts <outDir> [filter]
import fs from 'node:fs';
import { chromium, type Page } from 'playwright';

const BASE = 'http://localhost:4416';
const PREFIX = 'the-pantry-v2';
const VERSIONS: Record<string, number> = { preferences: 3, plan: 1, cupboard: 2, saved: 1, tour: 1, pro: 1, household: 1, account: 1 };
type Seed = Record<string, unknown>;

const ONBOARDED: Seed = { preferences: { onboarded: true, appearance: 'system', diet: 'everything' }, tour: { seen: true } };
const ITEMS = ['egg', 'butter', 'milk', 'plain-flour', 'cheddar', 'tomato', 'brown-onion', 'garlic', 'white-rice', 'chicken-thigh', 'soy-sauce', 'spinach', 'potato', 'lemon', 'parmesan', 'spaghetti', 'bacon', 'olive-oil'];
const STOCKED: Seed = {
  ...ONBOARDED,
  cupboard: { items: ITEMS.map((ingredientId) => ({ ingredientId, addedAt: 1, source: 'manual' })), shelf: { mode: 'assume', ids: [] }, moveTickedToCupboard: true },
};
function iso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const PLAN = {
  entries: [
    { id: 'e1', recipeId: 'carbonara', day: iso(0), slot: 'dinner', servings: 4 },
    { id: 'e2', recipeId: 'chana-masala', day: iso(1), slot: 'dinner', servings: 4 },
    { id: 'e3', recipeId: 'no-longer-here', day: iso(0), slot: 'lunch', servings: 2 },
  ],
  listEdits: {},
};
const SAVED = { bookmarks: [], collections: [], hidden: [], recentlyViewed: [] };
const row = (kind: string, key: string, data: unknown) => ({ kind, key, data, deleted: false, updatedAt: 1 });
const ACCOUNT = {
  who: { id: 'shot-user', email: 'cook@example.com', apple: false, name: 'Sam Cook' },
  device: 'shot-device',
  offered: {},
  mirror: {},
  pending: {},
  setAside: { a: row('myrecipe', 'm1', { title: 'Nan’s lasagne' }), b: row('collection', 'c9', { name: 'Everything we ever cooked' }) },
  lastSyncedAt: Date.now() - 60_000,
};

type Shot = { name: string; path: string; seed?: Seed; act?: (p: Page) => Promise<void>; full?: boolean };
const click = (id: string) => async (p: Page) => {
  await p.getByTestId(id).first().click();
  await p.waitForTimeout(700);
};

const SHOTS: Shot[] = [
  { name: 'UX-13-home-tour', path: '/', act: click('welcome-skip') },
  { name: 'UX-13-home-checklist', path: '/', act: async (p) => { await click('welcome-skip')(p); await click('tour-skip')(p); } },
  { name: 'UX-10-home-stocked', path: '/', seed: { ...STOCKED, plan: PLAN } },
  { name: 'F-10-plan-loaded', path: '/plan', seed: { ...STOCKED, plan: PLAN }, full: true },
  { name: 'UX-14-cupboard-empty', path: '/cupboard', seed: ONBOARDED },
  { name: 'UX-12-cupboard-stocked', path: '/cupboard', seed: STOCKED, full: true },
  { name: 'UX-15-cupboard-cookable', path: '/cupboard/cookable', seed: STOCKED },
  { name: 'REL2-8-cupboard-scan', path: '/cupboard/scan', seed: ONBOARDED },
  { name: 'UX-1-menu', path: '/menu', seed: ONBOARDED },
  { name: 'UX-1-post', path: '/post', seed: ONBOARDED },
  { name: 'UX-1-plate-missing', path: '/plate/nope', seed: ONBOARDED },
  { name: 'REL2-1-feed', path: '/feed', seed: ONBOARDED },
  { name: 'UX-11-collection-missing', path: '/collections/nope', seed: { ...ONBOARDED, saved: SAVED } },
  { name: 'UX-9-browse', path: '/browse', seed: ONBOARDED },
  { name: 'UX-16-recipe-missing', path: '/recipe/not-a-recipe', seed: ONBOARDED },
  { name: 'REL2-2-pro', path: '/pro', seed: ONBOARDED },
  { name: 'DATA-5-settings', path: '/settings', seed: { ...ONBOARDED, account: ACCOUNT }, full: true },
];

async function main() {
  const out = process.argv[2]!;
  const filter = process.argv[3];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const log: string[] = [];
  for (const scheme of ['light', 'dark'] as const) {
    for (const s of SHOTS) {
      if (filter && !s.name.includes(filter)) continue;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme });
      let aborted = 0;
      await ctx.route(/supabase\.co/, (route) => {
        aborted++;
        return route.abort('internetdisconnected');
      });
      const seed = s.seed ?? {};
      await ctx.addInitScript(
        ({ prefix, entries }: { prefix: string; entries: [string, string][] }) => {
          if (sessionStorage.getItem('e2e-seeded')) return;
          sessionStorage.setItem('e2e-seeded', '1');
          for (const [k, v] of entries) localStorage.setItem(`${prefix}/${k}`, v);
        },
        { prefix: PREFIX, entries: Object.entries(seed).map(([k, st]): [string, string] => [k, JSON.stringify({ state: st, version: VERSIONS[k] })]) },
      );
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(BASE + s.path);
        await page.waitForTimeout(2200);
        if (s.act) await s.act(page);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${out}/${s.name}-${scheme}.png`, fullPage: s.full === true });
        log.push(`${s.name}-${scheme}: ok, ${aborted} supabase calls aborted${errors.length ? `, errors: ${errors.join(' | ').slice(0, 200)}` : ''}`);
      } catch (e) {
        log.push(`${s.name}-${scheme}: FAILED ${String(e).slice(0, 200)}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${out}/shots.log`, log.join('\n'));
  console.log(log.filter((l) => l.includes('FAILED') || l.includes('errors')).join('\n') || `done ${log.length}`);
}
void main();
