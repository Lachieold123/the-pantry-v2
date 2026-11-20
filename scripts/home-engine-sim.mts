// The Home engine simulation. Takes the real published recipes, cooks and
// follows (read only, via scripts/published-snapshot.mts), makes synthetic
// viewers plus some of the AI cooks as viewers, lets each scroll Home once a
// day for a week (a hidden-taste click model makes the events), and compares
// the engine with a plain newest-first feed. Writes docs/reports/home-engine-sim.md.
// Run: npx tsx scripts/home-engine-sim.mts [--refresh] [--viewers=40] [--days=7]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildKitchen, type KitchenData } from '../src/domain/cupboard/kitchen.ts';
import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import { withAliases, type HierarchyData } from '../src/domain/ingredients/hierarchy.ts';
import { recommend } from '../src/domain/home-engine/engine.ts';
import { parseRankRow } from '../src/domain/home-engine/fromPublished.ts';
import {
  chronological,
  feedMetrics,
  interact,
  makeViewer,
  mean,
  rng,
  type FeedMetrics,
  type SimViewer,
} from '../src/domain/home-engine/simulate.ts';
import type { EngineEvent, EngineItem, RankedItem } from '../src/domain/home-engine/types.ts';
import { loadSnapshot } from './published-snapshot.mts';

const arg = (name: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? d);
const N_SYNTH = arg('viewers', 40);
const N_COOKS = 20;
const DAYS = arg('days', 7);
const PAGE = 20;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = <T,>(p: string) => JSON.parse(readFileSync(join(root, p), 'utf8')) as T;
const hierarchy = read<HierarchyData>('src/data/ingredients/hierarchy.json');
const index = buildIngredientIndex(withAliases(read<IngredientDef[]>('src/data/ingredients/ingredients.json'), hierarchy));
const kitchen = buildKitchen(index, read<KitchenData>('src/data/ingredients/kitchen.json'), hierarchy);

const snap = await loadSnapshot();
const cooks = new Map(snap.cooks.map((c) => [c.id, c]));
const items: EngineItem[] = snap.recipes
  .map((r) => parseRankRow({ ...r, cook: cooks.get(r.cook_id) }, index, kitchen)?.item)
  .filter((i): i is EngineItem => i !== undefined);
const world = { items, cookIds: [...cooks.keys()].sort() };
const START = Math.max(...items.map((i) => i.publishedAt)) + 12 * 3600_000;

const r = rng(20261012);
const viewers: SimViewer[] = Array.from({ length: N_SYNTH }, (_, i) => makeViewer(world, i, r));
// Some AI cooks as viewers: their real follows, a taste and pantry from what they publish.
const followsOf = new Map<string, Set<string>>();
for (const f of snap.follows) followsOf.set(f.follower_id, (followsOf.get(f.follower_id) ?? new Set()).add(f.followee_id));
for (const id of world.cookIds.filter((c) => followsOf.has(c)).slice(0, N_COOKS)) {
  const own = items.filter((i) => i.cookId === id);
  const sim = makeViewer({ items: own.length ? own : items, cookIds: world.cookIds }, 1000 + viewers.length, r);
  sim.viewer = { ...sim.viewer, id: `cook-${cooks.get(id)?.handle ?? id}`, follows: followsOf.get(id)! };
  viewers.push({ ...sim, label: `AI cook @${cooks.get(id)?.handle}` });
}

type Run = { perDay: FeedMetrics[][]; shown: Set<string>; impressions: number; saves: number; cooks: number; opens: number };
function simulate(kind: 'engine' | 'newest'): Run {
  const rr = rng(7);
  const global: EngineEvent[] = [];
  const own = new Map<string, EngineEvent[]>(viewers.map((v) => [v.viewer.id, []]));
  const run: Run = { perDay: [], shown: new Set(), impressions: 0, saves: 0, cooks: 0, opens: 0 };
  for (let day = 0; day < DAYS; day++) {
    const now = START + day * 24 * 3600_000;
    const today: FeedMetrics[] = [];
    for (const sim of viewers) {
      const viewer = { ...sim.viewer, events: own.get(sim.viewer.id)! };
      const feed: RankedItem[] =
        kind === 'engine'
          ? recommend({ items, viewer, now, seed: `${day}`, globalEvents: global, limit: PAGE })
          : chronological(items, viewer, PAGE);
      today.push(feedMetrics(sim, feed));
      for (const f of feed) run.shown.add(f.item.id);
      const events = interact({ ...sim, viewer }, feed, now, rr);
      own.get(sim.viewer.id)!.push(...events);
      global.push(...events);
      for (const e of events) {
        if (e.type === 'impression') run.impressions++;
        if (e.type === 'save') run.saves++;
        if (e.type === 'cook') run.cooks++;
        if (e.type === 'open') run.opens++;
      }
    }
    run.perDay.push(today);
  }
  return run;
}

/** One viewer's first Home, to show the reasons in words. */
function example(sim: SimViewer): string[] {
  const feed = recommend({ items, viewer: sim.viewer, now: START, seed: '0', limit: 10 });
  return [
    `Example: day 1 for a synthetic viewer (${sim.label}; follows ${sim.viewer.follows.size}, pantry ${sim.viewer.pantry.size} items).`,
    '',
    '| # | Recipe | Cook | Cuisine | Why (shown on the card) |',
    '|---|---|---|---|---|',
    ...feed.map((f, i) => `| ${i + 1} | ${f.item.title} | ${f.item.cookName} | ${f.item.cuisine} | ${f.explanation} |`),
  ];
}

const t0 = Date.now();
const engine = simulate('engine');
const newest = simulate('newest');
const secs = ((Date.now() - t0) / 1000).toFixed(1);

const avg = (run: Run, day: number, k: keyof FeedMetrics) => mean(run.perDay[day]!.map((m) => m[k]));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const row = (label: string, k: keyof FeedMetrics, fmt: (x: number) => string) =>
  `| ${label} | ${fmt(avg(newest, DAYS - 1, k))} | ${fmt(avg(engine, 0, k))} | ${fmt(avg(engine, DAYS - 1, k))} |`;
const n1 = (x: number) => x.toFixed(1);
const followers = viewers.filter((v) => v.viewer.follows.size > 0);
const followedShareWhenFollowing = (run: Run, day: number) =>
  mean(run.perDay[day]!.filter((_, i) => viewers[i]!.viewer.follows.size > 0).map((m) => m.followedShare));

const lines = [
  '# Home engine simulation',
  '',
  `Generated by \`npx tsx scripts/home-engine-sim.mts\` on ${new Date().toISOString().slice(0, 10)} (${secs}s).`,
  `Data: ${items.length} published recipes from ${cooks.size} AI cooks and ${snap.follows.length} follows, read from Supabase (SELECT only, snapshot ${snap.takenAt.slice(0, 16)}).`,
  `Viewers: ${N_SYNTH} synthetic (hidden taste of 2-3 cuisines, a pantry stocked from those cuisines, 0-11 follows leaning to cooks of those cuisines; 15% vegetarian) plus ${viewers.length - N_SYNTH} AI cooks with their real follows. ${followers.length} of ${viewers.length} follow someone.`,
  `Each viewer opens Home once a day for ${DAYS} days and sees the top ${PAGE}. A click model driven by the hidden taste (cuisine, follows, pantry, quick meals, with position bias) makes impressions, opens, dwell, saves, cooks, likes and hides. The engine only ever sees the events.`,
  '',
  '| Metric (top 20, mean per viewer) | Newest first | Engine day 1 | Engine day 7 |',
  '|---|---|---|---|',
  `| Share from followed cooks (viewers who follow someone) | ${pct(followedShareWhenFollowing(newest, DAYS - 1))} | ${pct(followedShareWhenFollowing(engine, 0))} | ${pct(followedShareWhenFollowing(engine, DAYS - 1))} |`,
  row('Average pantry match', 'avgPantryShare', pct),
  row('Share in the viewer’s hidden favourite cuisines', 'tasteShare', pct),
  row('Distinct cooks in the top 20', 'distinctCooks', n1),
  row('Distinct cuisines in the top 20', 'distinctCuisines', n1),
  row('Longest run from one cook', 'longestCookRun', n1),
  row('Diet violations (must be 0)', 'violations', n1),
  '',
  '| Over the week | Newest first | Engine |',
  '|---|---|---|',
  `| Catalogue coverage (distinct recipes shown to anyone / ${items.length}) | ${pct(newest.shown.size / items.length)} | ${pct(engine.shown.size / items.length)} |`,
  `| Opens per impression | ${pct(newest.opens / newest.impressions)} | ${pct(engine.opens / engine.impressions)} |`,
  `| Saves per impression | ${pct(newest.saves / newest.impressions)} | ${pct(engine.saves / engine.impressions)} |`,
  `| Cooks per impression | ${pct(newest.cooks / newest.impressions)} | ${pct(engine.cooks / engine.impressions)} |`,
  '',
  'Day 7 is lower than day 1 on taste and pantry by design: by then each viewer has seen, saved or cooked most of the 40-70 recipes in their favourite cuisines, so "already seen" suppression and the saved/cooked penalty move fresh things up instead of repeating them. Engagement per impression stays well above newest-first all week.',
  '',
  ...example(viewers.find((v) => v.viewer.follows.size > 2 && v.viewer.pantry.size > 10) ?? viewers[0]!),
  '',
  'Reading it: the engine puts followed cooks first without letting them take the whole page (the re-rank caps runs and per-page counts), lifts what the pantry covers, learns each viewer’s cuisines from their events over the week, and still spreads attention across far more of the catalogue than newest-first. Newest-first shows everyone the same 20 recipes.',
];
writeFileSync(join(root, 'docs/reports/home-engine-sim.md'), `${lines.join('\n')}\n`);
console.log(lines.slice(6).join('\n'));
