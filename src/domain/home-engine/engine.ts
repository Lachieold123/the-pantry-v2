// The Home engine: candidates, then ranking, then re-ranking (docs/HOME-ENGINE.md).
// Pure and synchronous: the same input always gives the same feed.
import { generateCandidates } from './candidates';
import { buildContext, type EngineInput } from './context';
import { reasonsFor } from './explain';
import { featuresOf, predictionsOf, scoreOf } from './rank';
import { rerank } from './rerank';
import type { RankedItem } from './types';

export type { EngineInput } from './context';

export function recommend(input: EngineInput): RankedItem[] {
  const ctx = buildContext(input);
  const candidates = generateCandidates(ctx);
  const scored: RankedItem[] = [];
  for (const [id, sources] of candidates) {
    const item = ctx.byId.get(id);
    const pantry = ctx.pantry.get(id);
    if (!item || !pantry) continue;
    const features = featuresOf(ctx, item);
    const predictions = predictionsOf(ctx, features);
    const reasons = reasonsFor(ctx, item, sources, features, pantry);
    scored.push({
      item,
      score: scoreOf(ctx, item, features, predictions),
      sources,
      features,
      predictions,
      pantry,
      reasons,
      explanation: reasons[0]?.text ?? '',
    });
  }
  scored.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  return rerank(scored, ctx.config, input.limit ?? scored.length);
}

/** Home's sections, if a screen wants them instead of one list: grouped by each item's headline reason, order kept. */
export function sectionsOf(feed: readonly RankedItem[]): { key: 'following' | 'cookable' | 'forYou'; items: RankedItem[] }[] {
  const following = feed.filter((r) => r.reasons[0]?.kind === 'following');
  const cookable = feed.filter((r) => r.reasons[0]?.kind === 'cookable' || r.reasons[0]?.kind === 'nearly');
  const rest = feed.filter((r) => !following.includes(r) && !cookable.includes(r));
  return [
    { key: 'following' as const, items: following },
    { key: 'cookable' as const, items: cookable },
    { key: 'forYou' as const, items: rest },
  ].filter((s) => s.items.length > 0);
}
