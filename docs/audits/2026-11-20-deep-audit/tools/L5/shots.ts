// Lane 5: screenshot every route at 390 x 844, light and dark, plus a DOM accessibility
// sweep per screen. Serves nothing itself: expects dist/ on http://localhost:4415.
// Network: every supabase.co call is aborted except plain GET reads on screens marked
// `read` (the public feed). No sign-in, no household, no row is ever created.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/shots.ts [filter]
import fs from 'node:fs';
import { chromium, type Page } from 'playwright';

const BASE = 'http://localhost:4415';
const OUT = 'docs/audits/2026-11-20-deep-audit/evidence/L5/shots';
const PREFIX = 'the-pantry-v2';
const VERSIONS: Record<string, number> = { preferences: 3, plan: 1, cupboard: 2, saved: 1, tour: 1, pro: 1, household: 1, 'my-recipes': 1 };
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
    { id: 'e3', recipeId: 'baked-salmon', day: iso(2), slot: 'dinner', servings: 2 },
    { id: 'e4', recipeId: 'avocado-toast', day: iso(1), slot: 'breakfast', servings: 2 },
  ],
  listEdits: {},
};
const SAVED = {
  bookmarks: ['carbonara', 'arancini', 'banh-mi', 'baked-ziti', 'bbq-ribs', 'chana-masala'].map((recipeId, i) => ({ recipeId, savedAt: 10 - i })),
  collections: [{ id: 'c1', name: 'Weeknight winners', recipeIds: ['carbonara', 'arancini', 'banh-mi'], createdAt: 1, updatedAt: 1 }],
  hidden: [],
  recentlyViewed: ['carbonara', 'banh-mi'],
};
const LONG = 'Grandma’s extraordinarily slow-roasted Moroccan-spiced lamb shoulder with preserved lemon, apricots and herbed couscous';
const MINE = {
  recipes: {
    'my-long-1': {
      id: 'my-long-1',
      source: 'own',
      createdAt: 1,
      updatedAt: 1,
      draft: {
        title: LONG,
        summary: 'A very long summary line that keeps going so we can see how the recipe page wraps a paragraph of text written by a person. 😋🍋',
        cuisine: 'middle-eastern',
        mealTypes: ['dinner'],
        difficulty: 'medium',
        prepMinutes: 30,
        cookMinutes: 240,
        servings: 6,
        onePot: false,
        ingredientsText: '2.2 kg lamb shoulder, bone in, trimmed of most of the fat and scored deeply all over\n2 preserved lemons\n200 g dried apricots\n1 tbsp ras el hanout',
        methodText: 'Heat the oven to 160°C.\nRub the lamb with the spice and roast for 4 hours, covered, until it falls apart when you push it with a fork.',
        notesText: '',
      },
    },
  },
};
const HOUSEHOLD = {
  household: { id: 'h1', name: 'Our kitchen', members: [{ userId: 'me', name: 'Lachlan' }, { userId: 's', name: 'Sam' }] },
  userId: 'me',
  mirror: {},
  pending: {},
  sharedRecipes: {},
  lastSyncedAt: 1,
};
const PRO_FREE = { entitlement: { isPro: false }, importsAt: [], previewLimits: true, pretendPro: false };

type Shot = { name: string; path: string; seed?: Seed; net?: 'none' | 'read'; act?: (p: Page) => Promise<void>; full?: boolean };
const click = (id: string) => async (p: Page) => {
  await p.getByTestId(id).first().click();
  await p.waitForTimeout(700);
};
async function welcomeTo(p: Page, step: number) {
  const steps: (() => Promise<void>)[] = [
    () => click('welcome-start')(p),
    async () => { await p.getByTestId('intent-plan').click(); await click('welcome-next')(p); },
    async () => { await p.getByTestId('avoid-nuts').click(); await click('welcome-next')(p); },
    async () => { await p.getByTestId('cuisine-italian').click(); await click('welcome-next')(p); },
    async () => { await p.getByTestId('weeknight-under-30').click(); await p.getByTestId('skill-starting').click(); await click('welcome-next')(p); },
    async () => { for (const id of ['garlic', 'egg', 'chicken-thigh']) await p.getByTestId(`welcome-cupboard-${id}`).click(); await click('welcome-next')(p); },
    async () => { await p.getByTestId(/^welcome-pick-/).nth(1).click(); await click('welcome-next')(p); },
  ];
  for (let i = 0; i < step; i++) await steps[i]!();
}

const SHOTS: Shot[] = [
  { name: '01-welcome', path: '/' },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ name: `01-welcome-step${n}`, path: '/', act: (p: Page) => welcomeTo(p, n) })),
  { name: '02-home-tour', path: '/', act: click('welcome-skip') },
  { name: '02-home-checklist', path: '/', act: async (p) => { await click('welcome-skip')(p); await click('tour-skip')(p); } },
  { name: '02-home-empty-cupboard', path: '/', seed: ONBOARDED, full: true },
  { name: '02-home-stocked', path: '/', seed: { ...STOCKED, plan: PLAN, saved: SAVED }, full: true },
  { name: '03-plan-empty', path: '/plan', seed: ONBOARDED },
  { name: '03-plan-loaded', path: '/plan', seed: { ...STOCKED, plan: PLAN }, full: true },
  { name: '03-plan-add', path: `/plan/add?day=${iso(3)}&slot=dinner`, seed: ONBOARDED },
  { name: '03-plan-locked', path: `/plan/add?day=${iso(16)}&slot=dinner`, seed: { ...ONBOARDED, pro: PRO_FREE } },
  { name: '04-list-empty', path: '/list', seed: ONBOARDED },
  { name: '04-list-loaded', path: '/list', seed: { ...STOCKED, plan: PLAN }, full: true },
  { name: '04-list-household', path: '/list', seed: { ...STOCKED, plan: PLAN, household: HOUSEHOLD }, net: 'none' },
  { name: '05-cupboard-empty', path: '/cupboard', seed: ONBOARDED },
  { name: '05-cupboard-stocked', path: '/cupboard', seed: STOCKED, full: true },
  { name: '05-cupboard-addlist', path: '/cupboard/add-list', seed: ONBOARDED },
  { name: '05-cupboard-shelf', path: '/cupboard/shelf', seed: STOCKED },
  { name: '05-cupboard-scan', path: '/cupboard/scan', seed: ONBOARDED },
  { name: '05-cupboard-scan-food', path: '/cupboard/scan?kind=food', seed: ONBOARDED },
  { name: '05-cupboard-cookable', path: '/cupboard/cookable', seed: STOCKED },
  { name: '05-cupboard-cookable-empty', path: '/cupboard/cookable', seed: ONBOARDED },
  { name: '06-menu', path: '/menu', seed: ONBOARDED },
  { name: '06-settings', path: '/settings', seed: ONBOARDED, net: 'none', full: true },
  { name: '07-library-empty', path: '/library', seed: ONBOARDED },
  { name: '07-library-cookmarks', path: '/library', seed: { ...ONBOARDED, saved: SAVED } },
  { name: '07-library-collections', path: '/library?tab=collections', seed: { ...ONBOARDED, saved: SAVED } },
  { name: '07-library-collections-empty', path: '/library?tab=collections', seed: ONBOARDED },
  { name: '07-library-mine', path: '/library?tab=mine', seed: { ...ONBOARDED, 'my-recipes': MINE } },
  { name: '07-library-mine-empty', path: '/library?tab=mine', seed: ONBOARDED },
  { name: '07-library-recent', path: '/library?tab=recent', seed: { ...ONBOARDED, saved: SAVED } },
  { name: '07-collection', path: '/collections/c1', seed: { ...ONBOARDED, saved: SAVED } },
  { name: '07-collection-missing', path: '/collections/nope', seed: ONBOARDED },
  { name: '07-stats-empty', path: '/stats', seed: ONBOARDED },
  { name: '08-browse', path: '/browse', seed: ONBOARDED, full: true },
  { name: '08-browse-noresults', path: '/browse?search=zzqxv', seed: ONBOARDED },
  { name: '08-filters', path: '/filters', seed: ONBOARDED, full: true },
  { name: '08-surprise', path: '/surprise', seed: ONBOARDED },
  { name: '09-recipe', path: '/recipe/carbonara', seed: STOCKED, full: true },
  { name: '09-recipe-long-own', path: '/recipe/my-long-1', seed: { ...ONBOARDED, 'my-recipes': MINE }, full: true },
  { name: '09-recipe-missing', path: '/recipe/not-a-recipe', seed: ONBOARDED },
  { name: '09-recipe-plan', path: '/recipe/carbonara/plan', seed: ONBOARDED },
  { name: '09-recipe-collect', path: '/recipe/carbonara/collect', seed: { ...ONBOARDED, saved: SAVED } },
  { name: '09-recipe-addlist', path: '/recipe/carbonara/list', seed: ONBOARDED },
  { name: '10-cook', path: '/recipe/carbonara/cook', seed: ONBOARDED },
  { name: '10-cook-step2', path: '/recipe/carbonara/cook', seed: ONBOARDED, act: async (p) => { await p.getByText('Next', { exact: false }).last().click(); await p.waitForTimeout(600); } },
  { name: '11-editor-new', path: '/my-recipe/edit', seed: ONBOARDED, full: true },
  { name: '11-editor-own', path: '/my-recipe/edit?id=my-long-1', seed: { ...ONBOARDED, 'my-recipes': MINE } },
  { name: '11-import', path: '/my-recipe/import', seed: ONBOARDED },
  { name: '12-post', path: '/post', seed: ONBOARDED },
  { name: '12-plate-missing', path: '/plate/nope', seed: ONBOARDED },
  { name: '13-feed', path: '/feed', seed: ONBOARDED, net: 'read' },
  { name: '13-feed-offline', path: '/feed', seed: ONBOARDED, net: 'none' },
  { name: '13-feed-recipe-missing', path: '/feed/00000000-0000-0000-0000-000000000000', seed: ONBOARDED, net: 'read' },
  { name: '13-cook-profile-missing', path: '/cooks/00000000-0000-0000-0000-000000000000', seed: ONBOARDED, net: 'read' },
  { name: '14-household-none', path: '/household', seed: ONBOARDED, net: 'none' },
  { name: '14-household-member', path: '/household', seed: { ...ONBOARDED, household: HOUSEHOLD }, net: 'none', full: true },
  { name: '14-join-offline', path: '/join/ABCD2345', seed: ONBOARDED, net: 'none' },
  { name: '15-account', path: '/account', seed: ONBOARDED, net: 'none' },
  { name: '15-account-moment', path: '/account?moment=household', seed: ONBOARDED, net: 'none' },
  { name: '15-account-email', path: '/account/email', seed: ONBOARDED, net: 'none' },
  { name: '16-pro', path: '/pro', seed: ONBOARDED, net: 'none', full: true },
  { name: '16-pro-planahead', path: '/pro?from=plan-ahead', seed: { ...ONBOARDED, pro: PRO_FREE }, net: 'none' },
  { name: '17-not-found', path: '/no-such-page', seed: ONBOARDED },
];

// Outermost clickable things, their name, role and size (RN web renders Pressable as a div).
async function sweep(p: Page) {
  return p.evaluate(() => {
    const out: { tag: string; role: string | null; name: string; w: number; h: number; testid: string | null }[] = [];
    const all = Array.from(document.querySelectorAll<HTMLElement>('body *'));
    for (const el of all) {
      const cs = getComputedStyle(el);
      const clickable = cs.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      if (!clickable) continue;
      const parent = el.parentElement;
      if (parent && getComputedStyle(parent).cursor === 'pointer' && el.tagName !== 'INPUT') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
      const name = (el.getAttribute('aria-label') ?? el.innerText ?? el.getAttribute('placeholder') ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
      out.push({ tag: el.tagName, role: el.getAttribute('role'), name, w: Math.round(r.width), h: Math.round(r.height), testid: el.getAttribute('data-testid') });
    }
    const headings = Array.from(document.querySelectorAll('[role="heading"],h1,h2,h3')).map((h) => (h as HTMLElement).innerText.slice(0, 40));
    return { controls: out, headings };
  });
}

async function main() {
  const filter = process.argv[2];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report: Record<string, unknown> = {};
  for (const scheme of ['light', 'dark'] as const) {
    for (const s of SHOTS) {
      if (filter && !s.name.includes(filter)) continue;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme });
      const requests: string[] = [];
      await ctx.route(/supabase\.co/, (route) => {
        const req = route.request();
        const ok = s.net === 'read' && req.method() === 'GET' && /\/(rest|storage)\/v1\//.test(req.url());
        requests.push(`${ok ? 'ALLOW' : 'ABORT'} ${req.method()} ${req.url().replace(/\?.*/, '')}`);
        return ok ? route.continue() : route.abort('internetdisconnected');
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
        await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png` });
        if (s.full) await page.screenshot({ path: `${OUT}/${s.name}-${scheme}-full.png`, fullPage: true });
        if (scheme === 'light') report[s.name] = { ...(await sweep(page)), errors, requests: [...new Set(requests)].slice(0, 12), url: page.url() };
      } catch (e) {
        report[s.name] = { failed: String(e).slice(0, 300), errors };
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/../sweep${filter ? '-' + filter : ''}.json`, JSON.stringify(report, null, 1));
  console.log('done', Object.keys(report).length);
}
void main();
