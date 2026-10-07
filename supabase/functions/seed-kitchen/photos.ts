// Photos from Pexels, copied into our own storage (parity rule 5), and avatars.
// Pexels allows downloading and hosting with a credit; Unsplash would need hotlinking.
// A vision check picks a photo only if it honestly shows the dish. No match
// means no photo: the app shows the cuisine tile, as it does today (D-036).

import { askTool } from './claude.ts';
import { type Ctx, count, note, outOfCredit, timeLeft } from './ctx.ts';
import { asJson, cookFilter, recordUsage } from './db.ts';
import { PHOTO_GUIDE, photoTool } from './prompts.ts';
import type { Draft } from './recipe.ts';

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { original: string; medium: string; tiny: string };
};

async function pexelsBudget(ctx: Ctx): Promise<number> {
  const [row] = await ctx.sql<{ n: number }[]>`
    select count(*)::int as n from seed.usage where purpose = 'pexels' and at > now() - interval '1 hour'`;
  return ctx.cfg.pexels_per_hour - (row?.n ?? 0);
}

async function searchPexels(ctx: Ctx, query: string, opts: { perPage: number; orientation?: string }): Promise<PexelsPhoto[]> {
  const params = new URLSearchParams({ query, per_page: String(opts.perPage), ...(opts.orientation ? { orientation: opts.orientation } : {}) });
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: ctx.pexelsKey! },
    signal: AbortSignal.timeout(15_000),
  });
  await recordUsage(ctx.sql, { purpose: 'pexels' });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()).photos ?? []) as PexelsPhoto[];
}

async function usedPhotoIds(ctx: Ctx): Promise<Set<string>> {
  const rows = await ctx.sql<{ id: string }[]>`
    select photo_source_id as id from public.published_recipes where photo_source = 'pexels' and photo_source_id is not null
    union select photo->>'id' from seed.dishes where photo ? 'id'`;
  return new Set(rows.map((r) => r.id));
}

/** Copies an image into a public bucket. Returns the stored path. */
export async function store(bucket: string, path: string, sourceUrl: string): Promise<{ path: string; bytes: number }> {
  const img = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!img.ok) throw new Error(`download ${img.status}`);
  const type = img.headers.get('content-type') ?? 'image/jpeg';
  const body = new Uint8Array(await img.arrayBuffer());
  const up = await fetch(`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      // New-style secret keys (sb_secret_…) go in apikey; only a legacy JWT key may also go in Authorization.
      apikey: serviceKey(),
      ...(serviceKey().split('.').length === 3 ? { Authorization: `Bearer ${serviceKey()}` } : {}),
      'content-type': type.split(';')[0]!,
      'x-upsert': 'true',
      'cache-control': 'max-age=31536000',
    },
    body,
  });
  if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
  return { path, bytes: body.byteLength };
}

function serviceKey(): string {
  return Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const sized = (p: PexelsPhoto, w: number, h?: number) =>
  `${p.src.original}?auto=compress&cs=tinysrgb&w=${w}${h ? `&h=${h}&fit=crop` : ''}`;

async function pick(ctx: Ctx, draft: Draft, candidates: PexelsPhoto[]): Promise<PexelsPhoto | undefined> {
  const content = [
    { type: 'text' as const, text: `Dish: ${draft.title}\n${draft.summary}\nLooks like: ${draft.photoDescription}` },
    ...candidates.flatMap((p, i) => [
      { type: 'text' as const, text: `Photo ${i}: ${p.alt}` },
      { type: 'image' as const, source: { type: 'url' as const, url: p.src.tiny } },
    ]),
  ];
  const out = await askTool<{ choice: number; sameDish: boolean; mainIngredientsVisible?: string[] }>(ctx.sql, ctx.cfg, ctx.anthropicKey!, {
    purpose: 'photo', model: ctx.cfg.models.checker, maxTokens: 400, tool: photoTool,
    system: [{ type: 'text', text: PHOTO_GUIDE }], content,
  });
  // Only a confident "same dish" with something of the recipe visible counts.
  return out.sameDish === true && (out.mainIngredientsVisible?.length ?? 0) > 0 ? candidates[out.choice] : undefined;
}

export async function photograph(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  if (!ctx.pexelsKey) return note(ctx, 'photo_errors', 'PEXELS_API_KEY is not set');
  const budget = await pexelsBudget(ctx);
  const limit = Math.min(cfg.per_tick.photo, Math.floor(budget / 2));
  if (limit <= 0) return;
  const dishes = await sql<{ id: string; draft: Draft }[]>`
    update seed.dishes set locked_until = now() + interval '4 minutes'
    where id in (
      select id from seed.dishes where stage = 'checked' and (locked_until is null or locked_until < now())
        and ${cookFilter(sql, cfg)}
      order by created_at for update skip locked limit ${limit}
    ) returning id, draft`;
  const used = await usedPhotoIds(ctx);

  // One at a time, so two dishes in the same tick can't take the same photo.
  for (const dish of dishes) {
    if (timeLeft(ctx) < 20_000) {
      await sql`update seed.dishes set locked_until = null where id = ${dish.id}`;
      continue;
    }
    try {
      let chosen: PexelsPhoto | undefined;
      for (const query of [dish.draft.photoQuery, dish.draft.photoFallbackQuery]) {
        const found = (await searchPexels(ctx, query, { perPage: 15, orientation: 'landscape' }))
          .filter((p) => !used.has(String(p.id))).slice(0, 8);
        if (found.length) chosen = await pick(ctx, dish.draft, found);
        if (chosen) break;
      }
      let photo: Record<string, unknown> = { none: true };
      if (chosen) {
        const stored = await store('recipe-photos', `house/${dish.id}.jpg`, sized(chosen, 1200));
        used.add(String(chosen.id));
        photo = {
          id: String(chosen.id),
          path: stored.path,
          credit: `Photo: ${chosen.photographer} / Pexels`.slice(0, 120),
          width: 1200,
          height: Math.round((1200 * chosen.height) / chosen.width),
          page: chosen.url,
          alt: chosen.alt,
        };
      }
      await sql`
        update seed.dishes set stage = 'photographed', photo = ${sql.json(asJson(photo))}, locked_until = null, updated_at = now()
        where id = ${dish.id}`;
      count(ctx, chosen ? 'photographed' : 'no_photo');
    } catch (e) {
      await sql`update seed.dishes set locked_until = null where id = ${dish.id}`;
      if (await outOfCredit(ctx, e)) return;
      note(ctx, 'photo_errors', String(e));
    }
  }
}

/** Copies each house cook's avatar into storage: an AI portrait or logo by URL, or a food photo from Pexels. */
export async function avatars(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  const rows = await sql<{ cook_id: string; avatar_source_url: string | null; avatar_photo_query: string | null; avatar_kind: string | null }[]>`
    select p.cook_id, p.avatar_source_url, p.avatar_photo_query, c.avatar_kind
    from seed.personas p join public.cooks c on c.id = p.cook_id
    where c.avatar_path is null and (p.avatar_source_url is not null or p.avatar_photo_query is not null)
      and ${cookFilter(sql, cfg, 'p.cook_id')}
    limit ${cfg.per_tick.avatars}`;
  const used = rows.some((r) => r.avatar_photo_query) ? await usedPhotoIds(ctx) : new Set<string>();
  for (const r of rows) {
    if (timeLeft(ctx) < 15_000) return;
    try {
      if (r.avatar_source_url) {
        const ext = r.avatar_source_url.split('?')[0]!.match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
        const { path } = await store('avatars', `cooks/${r.cook_id}.${ext}`, r.avatar_source_url);
        await sql`update public.cooks set avatar_path = ${path} where id = ${r.cook_id}`;
      } else if (ctx.pexelsKey) {
        const found = (await searchPexels(ctx, r.avatar_photo_query!, { perPage: 10, orientation: 'square' }))
          .filter((p) => !used.has(String(p.id)));
        const p = found[0];
        if (!p) throw new Error(`no avatar photo for "${r.avatar_photo_query}"`);
        used.add(String(p.id));
        const { path } = await store('avatars', `cooks/${r.cook_id}.jpg`, sized(p, 400, 400));
        await sql`
          update public.cooks set avatar_path = ${path}, avatar_kind = 'food-photo',
            avatar_credit = ${`Photo: ${p.photographer} / Pexels`.slice(0, 120)}
          where id = ${r.cook_id}`;
      }
      count(ctx, 'avatars');
    } catch (e) {
      note(ctx, 'avatar_errors', String(e));
    }
  }
}
