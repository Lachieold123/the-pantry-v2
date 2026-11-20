// Why an item is on Home, in words. Every card says one honest reason (the
// strongest that's true), and up to two more sit behind it for "Why this?".
import type { Context } from './context';
import { collabScore, cosine, itemVector } from './features';
import type { EngineItem, Features, PantryMatch, Reason, Source } from './types';

const CUISINE_WORDS: Record<string, string> = { 'middle-eastern': 'Middle Eastern', 'modern-australian': 'modern Australian' };

export function cuisineWords(cuisine: string): string {
  return CUISINE_WORDS[cuisine] ?? cuisine.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/** The liked item this one is most like, for "Because you saved X". */
function closestLiked(ctx: Context, item: EngineItem): { id: string; how: 'collab' | 'content' } | undefined {
  const co = collabScore(ctx.co, ctx.liked, item.id);
  if (co.via && co.score >= 0.2) return { id: co.via, how: 'collab' };
  let best = 0;
  let id: string | undefined;
  const v = itemVector(item);
  for (const l of ctx.liked.slice(0, 10)) {
    const other = ctx.byId.get(l);
    if (!other) continue;
    const s = cosine(itemVector(other), v);
    if (s > best) {
      best = s;
      id = l;
    }
  }
  return id && best >= 0.25 ? { id, how: 'content' } : undefined;
}

function pantryReason(m: PantryMatch, nameOf: (id: string) => string): Reason | undefined {
  if (m.have === 0 || m.total === 0) return undefined;
  if (m.missing.length === 0) return { kind: 'cookable', text: `You can cook this now: ${m.have}/${m.total} ingredients` };
  if (m.missing.length <= 2) return { kind: 'nearly', text: `${m.have}/${m.total} ingredients. Need ${m.missing.map(nameOf).join(', ')}` };
  if (m.have / m.total >= 0.6) return { kind: 'cookable', text: `You have ${m.have}/${m.total} ingredients` };
  return undefined;
}

export function reasonsFor(ctx: Context, item: EngineItem, sources: readonly Source[], f: Features, m: PantryMatch): Reason[] {
  const nameOf = ctx.input.nameOf ?? ((id: string) => id.replace(/-/g, ' '));
  const out: Reason[] = [];
  if (f.follow) out.push({ kind: 'following', text: `Because you follow ${item.cookName}` });
  const pantry = pantryReason(m, nameOf);
  // A recipe you can cook right now beats "you follow them" for the headline.
  if (pantry?.kind === 'cookable' && m.missing.length === 0) out.unshift(pantry);
  else if (pantry) out.push(pantry);
  if (f.similarity >= 0.2 || f.collab >= 0.2) {
    const near = closestLiked(ctx, item);
    const title = near ? ctx.byId.get(near.id)?.title : undefined;
    if (near?.how === 'collab' && title) out.push({ kind: 'saved', text: `Cooks who liked ${title} saved this` });
    else if (title) out.push({ kind: 'similar', text: `Because you liked ${title}` });
    else if (item.cuisine) out.push({ kind: 'similar', text: `More ${cuisineWords(item.cuisine)}, which you’ve been enjoying` });
  }
  if (f.affinity >= 0.3 && !f.follow) out.push({ kind: 'similar', text: `You’ve enjoyed ${item.cookName}’s recipes` });
  if (sources.includes('popular') && f.popularity >= 0.5) out.push({ kind: 'popular', text: 'Popular with cooks this week' });
  if (sources.includes('fresh') && f.freshness >= 0.7) out.push({ kind: 'fresh', text: `New from ${item.cookName}` });
  const newToYou = item.cuisine && !ctx.profile.get(`cuisine:${item.cuisine}`);
  if ((sources.includes('explore') || newToYou) && !out.length) {
    out.push({ kind: 'explore', text: item.cuisine ? `Something different: ${cuisineWords(item.cuisine)}` : 'Something different' });
  }
  if (!out.length) out.push({ kind: 'popular', text: `From ${item.cookName}` });
  return out.slice(0, 3);
}
