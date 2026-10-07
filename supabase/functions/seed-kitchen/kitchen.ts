// Planning menus, writing recipes and checking them.
//
//   planned ──write──► written ──check──► checked ──(photos.ts)──► photographed ──(social.ts)──► published
//      ▲                              │
//      └──── sent back with feedback ─┘  (three attempts, then failed)

import { AISLES, INGREDIENT_GROUPS } from './_domain.js';
import { INGREDIENTS } from './_ingredients.js';
import { askTool } from './claude.ts';
import { type Ctx, count, inParallel, note, timeLeft } from './ctx.ts';
import { asJson, cookFilter } from './db.ts';
import { ingredientBlocks, MENU_GUIDE, menuTool, recipeTool, REVIEW_GUIDE, reviewTool } from './prompts.ts';
import { assemble, cleanNewIngredients, type Draft, type Extra, normaliseDraft } from './recipe.ts';

const ONGOING_BUFFER = 3;
const MAX_ATTEMPTS = 3;

type Dish = {
  id: string;
  cook_id: string;
  title: string;
  cuisine: string;
  region: string | null;
  meal_type: string;
  angle: string | null;
  attempts: number;
  feedback: string | null;
  draft: Draft | null;
};

export async function loadExtras(ctx: Ctx): Promise<Extra[]> {
  return await ctx.sql<Extra[]>`
    select id, kind, alias_of, name, aliases, aisle, groups, swap_id, swap_tip, status
    from public.ingredient_extras where status <> 'rejected' order by id`;
}

async function briefs(ctx: Ctx, cookIds: string[]): Promise<Map<string, unknown>> {
  const rows = await ctx.sql<{ cook_id: string; brief: unknown }[]>`
    select cook_id, brief from seed.personas where cook_id = any(${cookIds}::uuid[])`;
  return new Map(rows.map((r) => [r.cook_id, r.brief]));
}

// ─── Menus ───────────────────────────────────────────────────────────────

export async function planMenus(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  // Plan just ahead of the writing: a few dishes at a time, to whoever has fewest,
  // so a limited budget never pays to plan dishes that won't be written.
  const due = await sql<{ cook_id: string; brief: { cuisines?: { id: string }[] }; need: number }[]>`
    select p.cook_id, p.brief, greatest(p.backlog_target - c.recipe_count, 0) + ${ONGOING_BUFFER} - w.waiting as need
    from seed.personas p join public.cooks c on c.id = p.cook_id,
    lateral (
      select count(*) filter (where d.stage not in ('failed', 'published'))::int as waiting,
             count(*) filter (where d.stage = 'planned')::int as planned,
             count(*) filter (where d.stage <> 'failed')::int as total
      from seed.dishes d where d.cook_id = p.cook_id
    ) w
    where p.active and ${cookFilter(sql, cfg, 'p.cook_id')} and w.planned < 2
      and greatest(p.backlog_target - c.recipe_count, 0) + ${ONGOING_BUFFER} - w.waiting > 0
    order by w.total, random()
    limit ${cfg.per_tick.menus}`;

  await inParallel(due, 2, async (row) => {
    if (timeLeft(ctx) < 60_000) return;
    const n = Math.min(row.need, 5);
    const cuisines = (row.brief.cuisines ?? []).map((c) => c.id);
    const mine = await sql<{ title: string }[]>`select title from seed.dishes where cook_id = ${row.cook_id} and stage <> 'failed'`;
    const taken = await sql<{ title: string }[]>`
      select title from seed.dishes
      where cook_id <> ${row.cook_id} and stage <> 'failed' and cuisine = any(${cuisines}::text[])
      order by created_at desc limit 400`;
    try {
      const out = await askTool<{ dishes: { title: string; cuisine: string; region: string; meal_type: string; angle: string }[] }>(
        sql, cfg, ctx.anthropicKey!, {
          purpose: 'menu',
          model: cfg.models.writer,
          maxTokens: 3000,
          tool: menuTool,
          system: [{ type: 'text', text: MENU_GUIDE }],
          content: [{
            type: 'text',
            text: [
              `THE COOK\n${JSON.stringify(row.brief, null, 1)}`,
              `ALREADY ON THEIR MENU\n${mine.map((t) => t.title).join('\n') || '(nothing yet)'}`,
              `TAKEN BY OTHER COOKS\n${taken.map((t) => t.title).join('\n') || '(nothing yet)'}`,
              `Plan ${n} new dishes for this cook.`,
            ].join('\n\n'),
          }],
        });
      for (const d of out.dishes.slice(0, n)) {
        const added = await sql`
          insert into seed.dishes (cook_id, title, cuisine, region, meal_type, angle)
          values (${row.cook_id}, ${d.title.trim().slice(0, 80)}, ${d.cuisine}, ${d.region?.slice(0, 40) ?? null}, ${d.meal_type}, ${d.angle ?? null})
          on conflict ((lower(title))) where stage <> 'failed' do nothing returning id`;
        count(ctx, added.length ? 'planned' : 'planned_duplicate');
      }
    } catch (e) {
      note(ctx, 'menu_errors', String(e));
    }
  });
}

// ─── Writing ─────────────────────────────────────────────────────────────

async function claim(ctx: Ctx, stage: string, limit: number): Promise<Dish[]> {
  const { sql, cfg } = ctx;
  if (limit <= 0) return [];
  return await sql<Dish[]>`
    update seed.dishes set locked_until = now() + interval '4 minutes', updated_at = now()
      ${stage === 'planned' ? sql`, attempts = attempts + 1` : sql``}
    where id in (
      select d.id from seed.dishes d
      where d.stage = ${stage} and (d.locked_until is null or d.locked_until < now()) and ${cookFilter(sql, cfg, 'd.cook_id')}
      -- Round robin: the cook with the fewest finished dishes goes first, so a
      -- limited budget spreads across everyone instead of filling a few.
      order by (select count(*) from seed.dishes x where x.cook_id = d.cook_id
                  and x.stage in ('written', 'checked', 'photographed', 'published')), d.created_at
      for update of d skip locked
      limit ${limit}
    )
    returning id, cook_id, title, cuisine, region, meal_type, angle, attempts, feedback, draft`;
}

async function sendBack(ctx: Ctx, dish: Dish, feedback: string): Promise<void> {
  const failed = dish.attempts >= MAX_ATTEMPTS;
  await ctx.sql`
    update seed.dishes set stage = ${failed ? 'failed' : 'planned'}, feedback = ${feedback.slice(0, 2000)},
      locked_until = null, updated_at = now()
    where id = ${dish.id}`;
  count(ctx, failed ? 'failed' : 'sent_back');
  note(ctx, 'sent_back_why', `${dish.title}: ${feedback}`);
}

export async function writeRecipes(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  const dishes = await claim(ctx, 'planned', cfg.per_tick.write);
  if (!dishes.length) return;
  const extras = await loadExtras(ctx);
  const system = ingredientBlocks(INGREDIENTS, extras);
  const cooks = await briefs(ctx, [...new Set(dishes.map((d) => d.cook_id))]);

  await inParallel(dishes, cfg.per_tick.write, async (dish) => {
    const text = [
      `THE COOK\n${JSON.stringify(cooks.get(dish.cook_id), null, 1)}`,
      `THE DISH\nTitle: ${dish.title}\nCuisine: ${dish.cuisine}${dish.region ? ` (${dish.region})` : ''}\nMeal: ${dish.meal_type}\nWhat it is: ${dish.angle ?? ''}`,
      dish.feedback ? `The tester sent the last version back. Fix every one of these:\n${dish.feedback}` : '',
      'Write the recipe.',
    ].filter(Boolean).join('\n\n');
    try {
      const raw = await askTool<unknown>(sql, cfg, ctx.anthropicKey!, {
        purpose: 'write', model: cfg.models.writer, maxTokens: 5000, tool: recipeTool, system,
        content: [{ type: 'text', text }],
      });
      const { draft, problems } = normaliseDraft(raw);
      if (!draft) return await sendBack(ctx, dish, problems.map((p) => `- ${p}`).join('\n'));
      await sql`
        update seed.dishes set stage = 'written', draft = ${sql.json(asJson(draft))}, locked_until = null, updated_at = now()
        where id = ${dish.id}`;
      count(ctx, 'written');
    } catch (e) {
      await sendBack(ctx, dish, `Writing failed: ${String(e)}`);
    }
  });
}

// ─── Checking ────────────────────────────────────────────────────────────

function asText(d: Draft): string {
  return [
    `${d.title} (${d.cuisine}${d.region ? `, ${d.region}` : ''})`,
    `Serves ${d.servings} · prep ${d.prepMinutes} min · cook ${d.cookMinutes} min · ${d.difficulty}`,
    d.summary,
    ...d.ingredientGroups.map((g) => `${g.title ? `${g.title}:\n` : 'Ingredients:\n'}${g.lines.map((l) => `- ${l}`).join('\n')}`),
    `Method:\n${d.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    d.notes?.length ? `Notes:\n${d.notes.join('\n')}` : '',
    `Caption: ${d.caption}`,
  ].filter(Boolean).join('\n\n');
}

export async function checkRecipes(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  const dishes = await claim(ctx, 'written', cfg.per_tick.write * 2);
  await inParallel(dishes, 4, async (dish) => {
    try {
      await checkOne(ctx, dish);
    } catch (e) {
      await sendBack(ctx, dish, `Checking failed: ${String(e)}`);
    }
  });
}

async function checkOne(ctx: Ctx, dish: Dish): Promise<void> {
  const { sql, cfg } = ctx;
  {
    const draft = dish.draft!;
    const declared = cleanNewIngredients(draft.newIngredients ?? [], AISLES, INGREDIENT_GROUPS);
    for (const x of declared.ok) {
      await sql`
        insert into public.ingredient_extras (id, kind, alias_of, name, aliases, aisle, groups, swap_id, swap_tip)
        values (${x.id}, ${x.kind}, ${x.alias_of}, ${x.name.slice(0, 60)}, ${x.aliases}, ${x.aisle}, ${x.groups},
                ${x.swap_id ?? null}, ${x.swap_tip ?? null})
        on conflict (id) do nothing`;
    }
    const built = assemble(dish.id, draft, await loadExtras(ctx));
    const problems = [...declared.problems, ...built.problems];
    if (problems.length) return await sendBack(ctx, dish, problems.map((p) => `- ${p}`).join('\n'));

    try {
      const review = await askTool<{ verdict: 'pass' | 'fix'; problems: string[] }>(sql, cfg, ctx.anthropicKey!, {
        purpose: 'review', model: cfg.models.checker, maxTokens: 800, tool: reviewTool,
        system: [{ type: 'text', text: REVIEW_GUIDE }],
        content: [{ type: 'text', text: asText(draft) }],
      });
      if (review.verdict === 'fix') return await sendBack(ctx, dish, review.problems.map((p) => `- ${p}`).join('\n'));
    } catch (e) {
      // The review didn't happen; try again next tick rather than publish unreviewed.
      await sql`update seed.dishes set locked_until = null where id = ${dish.id}`;
      return note(ctx, 'review_errors', String(e));
    }
    await sql`
      update seed.dishes set stage = 'checked', recipe = ${sql.json(asJson(built.recipe))}, feedback = null,
        locked_until = null, updated_at = now()
      where id = ${dish.id}`;
    count(ctx, 'checked');
  }
}
