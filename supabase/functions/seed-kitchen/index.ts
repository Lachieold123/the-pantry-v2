// The seed kitchen (D-044, docs/SEED-KITCHEN.md): the house cooks' recipes,
// written, checked, photographed and posted on a rhythm. pg_cron calls this
// every minute with a shared secret from the vault; each call is one "tick"
// that does a bounded amount of each stage and stops well inside the time limit.
//
// A tick can also be asked for specific stages: POST {"stages": ["write", "check"]}.

import { type Ctx, timeLeft } from './ctx.ts';
import { asJson, checkSecret, connect, inFirstRun, loadConfig, releaseLock, secret, spentThisMonth, takeLock } from './db.ts';
import { checkRecipes, planMenus, writeRecipes } from './kitchen.ts';
import { avatars, photograph } from './photos.ts';
import { follows, publish, refreshDiets, verifyExtras } from './social.ts';

const TICK_MS = 110_000;

const STAGES: Record<string, (ctx: Ctx) => Promise<void>> = {
  avatars,
  verify: verifyExtras,
  menus: planMenus,
  write: writeRecipes,
  check: checkRecipes,
  photo: photograph,
  publish,
  follows,
  diets: refreshDiets,
};
const NEEDS_AI = new Set(['verify', 'menus', 'write', 'check', 'photo']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const started = Date.now();
  const sql = connect();
  let locked = false;
  try {
    if (!(await checkSecret(sql, req.headers.get('x-seed-secret')))) return new Response('unauthorised', { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { stages?: string[] };
    locked = await takeLock(sql);
    if (!locked) return Response.json({ skipped: 'another tick is running' });

    const cfg = await loadConfig(sql);
    const anthropicKey = await secret(sql, 'ANTHROPIC_API_KEY');
    const pexelsKey = await secret(sql, 'PEXELS_API_KEY');
    const spent = await spentThisMonth(sql);
    const cap = (await inFirstRun(sql)) ? cfg.first_run_cap_usd : cfg.monthly_cap_usd;
    const ctx: Ctx = {
      sql,
      cfg,
      anthropicKey,
      pexelsKey,
      deadline: started + TICK_MS,
      aiAllowed: !cfg.paused && spent < cap && Boolean(anthropicKey),
      log: { spent_usd: Math.round(spent * 100) / 100, cap_usd: cap },
    };
    if (cfg.paused) ctx.log.paused = true;
    if (!anthropicKey) ctx.log.missing = 'ANTHROPIC_API_KEY';
    if (spent >= cap) ctx.log.over_cap = true;

    const wanted = body.stages?.length ? body.stages : Object.keys(STAGES);
    for (const name of wanted) {
      const stage = STAGES[name];
      if (!stage || timeLeft(ctx) < 15_000) continue;
      if (NEEDS_AI.has(name) && !ctx.aiAllowed) continue;
      if (cfg.paused) continue;
      try {
        await stage(ctx);
      } catch (e) {
        ctx.log[`${name}_crashed`] = String(e).slice(0, 300);
      }
    }
    const ms = Date.now() - started;
    await sql`insert into seed.runs (ms, summary) values (${ms}, ${sql.json(asJson(ctx.log))})`;
    await sql`delete from seed.runs where at < now() - interval '14 days'`;
    return Response.json({ ms, ...ctx.log });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  } finally {
    if (locked) await releaseLock(sql).catch(() => {});
    await sql.end({ timeout: 2 }).catch(() => {});
  }
});
