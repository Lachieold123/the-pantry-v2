// Fixing photos (7 October): about a third of the first stock-photo matches
// showed the wrong dish. Two stages put that right.
//
//   recheck   Every stock photo chosen before the stricter check is looked at
//             again, on its own. A wrong one is taken off the recipe (published
//             or not) and the dish waits for an AI photo instead.
//   aiphotos  AI-generated photos are made outside this function (Higgsfield,
//             from a Claude session) and their URLs written to photo.ai_url.
//             This copies each into our own storage and attaches it, labelled
//             "AI-generated photo" (D-029). Published recipes get it too.

import { type Ctx, count, inParallel, note, outOfCredit, timeLeft } from './ctx.ts';
import { asJson } from './db.ts';
import { pick, type PexelsPhoto, store } from './photos.ts';
import type { Draft } from './recipe.ts';

type Photo = Record<string, unknown> & { id?: string; alt?: string; path?: string; ai_url?: string; width?: number; height?: number };

const AI_CREDIT = 'AI-generated photo';

async function clearPublishedPhoto(ctx: Ctx, id: string): Promise<void> {
  await ctx.sql`
    update public.published_recipes set photo_path = null, photo_credit = null, photo_source = null,
      photo_source_id = null, photo_width = null, photo_height = null
    where id = ${id}`;
}

export async function recheck(ctx: Ctx): Promise<void> {
  const { sql, cfg } = ctx;
  const limit = (cfg.per_tick as Record<string, number>).recheck ?? 10;
  const rows = await sql<{ id: string; draft: Draft; photo: Photo; published_id: string | null }[]>`
    select id, draft, photo, published_id from seed.dishes
    where photo ? 'id' and not (photo ? 'rechecked') and stage in ('photographed', 'published')
    order by updated_at limit ${limit}`;
  await inParallel(rows, 4, async (r) => {
    if (timeLeft(ctx) < 15_000 || !ctx.aiAllowed) return;
    const id = String(r.photo.id);
    // Pexels' standard preview address for a photo id: the same 350 px image the picker now sees.
    const candidate = {
      id: Number(id), width: 0, height: 0, url: '', photographer: '', photographer_url: '', alt: String(r.photo.alt ?? ''),
      src: { original: '', tiny: '', medium: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=350` },
    } satisfies PexelsPhoto;
    try {
      const kept = await pick(ctx, r.draft, [candidate]);
      if (kept) {
        await sql`update seed.dishes set photo = photo || '{"rechecked": true}'::jsonb where id = ${r.id}`;
        count(ctx, 'recheck_kept');
      } else {
        const photo = { none: true, want_ai: true, rejected: { id, alt: r.photo.alt ?? null } };
        await sql`update seed.dishes set photo = ${sql.json(asJson(photo))}, updated_at = now() where id = ${r.id}`;
        if (r.published_id) await clearPublishedPhoto(ctx, r.published_id);
        count(ctx, 'recheck_removed');
      }
    } catch (e) {
      if (await outOfCredit(ctx, e)) return;
      // An image Pexels won't serve any more can't be checked, so it can't stay.
      if (/download the file/i.test(String(e))) {
        await sql`update seed.dishes set photo = ${sql.json(asJson({ none: true, want_ai: true, rejected: { id } }))} where id = ${r.id}`;
        if (r.published_id) await clearPublishedPhoto(ctx, r.published_id);
        count(ctx, 'recheck_removed');
      } else note(ctx, 'recheck_errors', String(e));
    }
  });
}

export async function attachAiPhotos(ctx: Ctx): Promise<void> {
  const { sql } = ctx;
  const rows = await sql<{ id: string; photo: Photo; published_id: string | null }[]>`
    select id, photo, published_id from seed.dishes
    where photo ? 'ai_url' and not (photo ? 'path') limit 20`;
  for (const r of rows) {
    if (timeLeft(ctx) < 10_000) return;
    try {
      const url = String(r.photo.ai_url);
      const ext = url.split('?')[0]!.match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
      const { path } = await store('recipe-photos', `house/${r.id}-ai.${ext}`, url);
      const photo = { ai: true, path, credit: AI_CREDIT, width: r.photo.width ?? null, height: r.photo.height ?? null, rechecked: true };
      await sql`update seed.dishes set photo = ${sql.json(asJson(photo))}, updated_at = now() where id = ${r.id}`;
      if (r.published_id) {
        await sql`
          update public.published_recipes set photo_path = ${path}, photo_credit = ${AI_CREDIT}, photo_source = 'ai',
            photo_source_id = null, photo_width = ${photo.width}, photo_height = ${photo.height}
          where id = ${r.published_id}`;
      }
      count(ctx, 'ai_photos');
    } catch (e) {
      note(ctx, 'ai_photo_errors', String(e));
    }
  }
}
