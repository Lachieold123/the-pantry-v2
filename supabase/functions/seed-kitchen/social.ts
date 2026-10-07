// Going public: releasing recipes at believable times, follows between house
// cooks, and confirming new ingredients so recipes can claim their diets.
// House cooks never like, comment on or follow real people's things (D-044).

import { askTool } from './claude.ts';
import { type Ctx, count, note, timeLeft } from './ctx.ts';
import { asJson, cookFilter } from './db.ts';
import { loadExtras } from './kitchen.ts';
import { VERIFY_GUIDE, verifyTool } from './prompts.ts';
import { assemble, type Draft, slugify } from './recipe.ts';

type Due = { cook_id: string; backlog_target: number; posts_per_week: string; recipe_count: number };
type Ready = { id: string; draft: Draft; photo: { id?: string; path?: string; credit?: string; width?: number; height?: number } };

const DAY_MS = 86_400_000;

/** When the next one goes out: the first batch spread over `backlog_spread_days`, then the cook's own rhythm. */
function nextGap(ctx: Ctx, p: Due, published: number): number | undefined {
  const inBacklog = published < p.backlog_target;
  const spread = ctx.cfg.backlog_spread_days;
  if (inBacklog && spread <= 0) return 0;
  const perDay = inBacklog ? p.backlog_target / spread : Number(p.posts_per_week) / 7;
  if (perDay <= 0) return undefined;
  return (DAY_MS / perDay) * (0.5 + Math.random());
}

export async function publish(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  if (!cfg.publishing) return;
  // Due, and daytime where the cook lives (unless the first batch is going out all at once).
  const due = await sql<Due[]>`
    select p.cook_id, p.backlog_target, p.posts_per_week, c.recipe_count
    from seed.personas p join public.cooks c on c.id = p.cook_id
    where p.active and ${cookFilter(sql, cfg, 'p.cook_id')}
      and (p.next_post_at is null or p.next_post_at <= now())
      and (${cfg.backlog_spread_days <= 0} or extract(hour from now() at time zone p.timezone) between 7 and 21)
    order by p.next_post_at nulls first
    limit ${cfg.per_tick.publish}`;
  let extras = await loadExtras(ctx);

  for (const p of due) {
    let published = p.recipe_count;
    for (let gap: number | undefined = 0; gap === 0 && timeLeft(ctx) > 10_000; ) {
      const [dish] = await sql<Ready[]>`
        select id, draft, photo from seed.dishes
        where cook_id = ${p.cook_id} and stage = 'photographed' order by created_at limit 1`;
      if (!dish) break;
      if (await publishOne(ctx, p.cook_id, dish, extras)) published++;
      else extras = await loadExtras(ctx);
      gap = nextGap(ctx, p, published);
      const next = gap === undefined ? null : new Date(Date.now() + gap);
      await sql`update seed.personas set next_post_at = ${next} where cook_id = ${p.cook_id}`;
    }
  }
}

async function publishOne(ctx: Ctx, cookId: string, dish: Ready, extras: Awaited<ReturnType<typeof loadExtras>>): Promise<boolean> {
  const { sql } = ctx;
  const d = dish.draft;
  const built = assemble(dish.id, d, extras);
  if (built.problems.length) {
    await sql`update seed.dishes set stage = 'planned', feedback = ${built.problems.join('\n')} where id = ${dish.id}`;
    note(ctx, 'publish_errors', `${d.title}: ${built.problems[0]}`);
    return false;
  }
  const base = slugify(d.title) || 'recipe';
  const [{ taken }] = await sql<{ taken: boolean }[]>`
    select exists (select 1 from public.published_recipes where cook_id = ${cookId} and slug = ${base}) as taken`;
  const slug = taken ? `${base}-${dish.id.slice(0, 4)}` : base;
  const photo = dish.photo?.id ? dish.photo : undefined;
  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into public.published_recipes (
          id, cook_id, slug, title, cuisine, region, meal_types, diets, difficulty, total_minutes, recipe, caption,
          photo_path, photo_credit, photo_source, photo_source_id, photo_width, photo_height, review, diets_pending)
        values (
          ${dish.id}, ${cookId}, ${slug}, ${d.title.slice(0, 80)}, ${d.cuisine}, ${d.region?.slice(0, 40) ?? null},
          ${d.mealTypes}, ${built.recipe.diets as string[]}, ${d.difficulty}, ${Math.max(d.prepMinutes + d.cookMinutes, 1)},
          ${tx.json(asJson(built.recipe))}, ${d.caption.slice(0, 600)},
          ${photo?.path ?? null}, ${photo?.credit ?? null}, ${photo ? 'pexels' : null}, ${photo?.id ?? null},
          ${photo?.width ?? null}, ${photo?.height ?? null}, 'auto-checked', ${built.dietsPending || built.unmatched.length > 0})`;
      await tx`update seed.dishes set stage = 'published', published_id = ${dish.id}, updated_at = now() where id = ${dish.id}`;
    });
    count(ctx, 'published');
    return true;
  } catch (e) {
    note(ctx, 'publish_errors', `${d.title}: ${String(e)}`);
    return false;
  }
}

// ─── Follows ─────────────────────────────────────────────────────────────

type Cook = { id: string; kind: string; cuisines: string[]; region: string; following: number };

function chooseFollows(me: Cook, others: Cook[], k: number): string[] {
  const mine = new Set(me.cuisines);
  return others
    .filter((o) => o.id !== me.id && o.kind === 'house')
    .map((o) => ({ id: o.id, score: o.cuisines.filter((c) => mine.has(c)).length * 2 + (o.region === me.region ? 2 : 0) + Math.random() * 3 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((o) => o.id);
}

export async function follows(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  const cooks = await sql<Cook[]>`
    select c.id, c.kind, c.following_count as following,
      coalesce((select array_agg(x->>'id') from jsonb_array_elements(p.brief->'cuisines') x), '{}') as cuisines,
      coalesce(p.brief->>'country', '') as region
    from public.cooks c join seed.personas p on p.cook_id = c.id
    where c.kind in ('house', 'official') and p.active`;
  const official = cooks.find((c) => c.kind === 'official');
  const filter = new Set(cfg.only_cooks);
  const newcomers = cooks.filter((c) => c.kind === 'house' && c.following === 0 && (filter.size === 0 || filter.has(c.id)));

  for (const me of newcomers) {
    const picks = chooseFollows(me, cooks, 6 + Math.floor(Math.random() * 30));
    if (official) picks.push(official.id);
    for (const id of picks) {
      await sql`insert into public.follows (follower_id, followee_id) values (${me.id}, ${id}) on conflict do nothing`;
    }
    count(ctx, 'follows', picks.length);
  }
  // Now and then, someone finds someone new: about three a day across the kitchen.
  const house = cooks.filter((c) => c.kind === 'house' && c.following > 0 && c.following < 80);
  if (house.length && Math.random() < 3 / 1440) {
    const me = house[Math.floor(Math.random() * house.length)]!;
    const [id] = chooseFollows(me, cooks, 8).sort(() => Math.random() - 0.5);
    if (id) {
      await sql`insert into public.follows (follower_id, followee_id) values (${me.id}, ${id}) on conflict do nothing`;
      count(ctx, 'follows');
    }
  }
}

// ─── New ingredients ─────────────────────────────────────────────────────

export async function verifyExtras(ctx: Ctx, ids?: string[]): Promise<void> {
  const { sql, cfg } = ctx;
  const rows = await sql<{ id: string; kind: string; name: string; aliases: string[]; alias_of: string | null; groups: string[]; review_note: string | null }[]>`
    select id, kind, name, aliases, alias_of, groups, review_note from public.ingredient_extras
    where status = 'proposed' ${ids ? sql`and id = any(${ids}::text[])` : sql``}
    order by created_at limit 20`;
  if (!rows.length || (!ids && timeLeft(ctx) < 30_000)) return;
  // The checker doesn't see the groups first proposed, so its answer is independent.
  const list = rows.map((r) => r.kind === 'alias'
    ? `${r.id}: is "${r.name}" another name for database item "${r.alias_of}"?`
    : `${r.id}: ${r.name}${r.aliases.length ? ` (also ${r.aliases.join(', ')})` : ''}`).join('\n');
  try {
    const out = await askTool<{ items: { id: string; groups?: string[]; aliasIsRight?: boolean; note?: string }[] }>(sql, cfg, ctx.anthropicKey!, {
      purpose: 'verify', model: cfg.models.checker, maxTokens: 2500, tool: verifyTool,
      system: [{ type: 'text', text: VERIFY_GUIDE }], content: [{ type: 'text', text: list }],
    });
    const answers = new Map(out.items.map((i) => [i.id, i]));
    for (const r of rows) {
      const a = answers.get(r.id);
      if (!a) continue;
      if (r.review_note === 'auto') {
        // Declared by the checker, not the writer: there is no first answer to compare, so this one stands.
        await sql`update public.ingredient_extras set groups = ${a.groups ?? []}, status = 'verified',
          review_note = 'auto: groups from one check' where id = ${r.id}`;
        count(ctx, 'extras_verified');
        continue;
      }
      const same = r.kind === 'alias'
        ? a.aliasIsRight === true
        : [...(a.groups ?? [])].sort().join(',') === [...r.groups].sort().join(',');
      const why = same ? null : r.kind === 'alias' ? `checker: not the same thing. ${a.note ?? ''}` : `writer said [${r.groups}], checker said [${a.groups ?? []}]. ${a.note ?? ''}`;
      await sql`update public.ingredient_extras set status = ${same ? 'verified' : 'needs-review'}, review_note = ${why} where id = ${r.id}`;
      count(ctx, same ? 'extras_verified' : 'extras_need_review');
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'OutOfCredit') throw e;
    note(ctx, 'verify_errors', String(e));
  }
}

/** Recipes published before their new ingredients were confirmed get their diets once they are. */
export async function refreshDiets(ctx: Ctx): Promise<void> {
  const { sql } = ctx;
  const rows = await sql<{ id: string; draft: Draft }[]>`
    select d.id, d.draft from public.published_recipes r join seed.dishes d on d.published_id = r.id
    where r.diets_pending limit 30`;
  if (!rows.length) return;
  const extras = await loadExtras(ctx);
  for (const r of rows) {
    const built = assemble(r.id, r.draft, extras);
    if (built.dietsPending || built.unmatched.length || built.problems.length) continue;
    await sql`
      update public.published_recipes set diets = ${built.recipe.diets as string[]}, diets_pending = false,
        recipe = jsonb_set(recipe, '{diets}', ${sql.json(asJson(built.recipe.diets))})
      where id = ${r.id}`;
    count(ctx, 'diets_refreshed');
  }
}
