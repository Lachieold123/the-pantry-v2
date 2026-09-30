// The single "Welcome back" line after the old-app import (D-005).
import type { OldAppImport } from './oldApp';

const count = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : undefined);
const join = (parts: readonly string[]) =>
  parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/**
 * What came across, what still needs a cuisine, and what was left behind.
 * Undefined only when there's nothing at all to say: a tester whose only old
 * data was hidden dishes or a cupboard still hears about it (audit F149).
 */
export function welcomeBackLine(result: OldAppImport): string | undefined {
  const brought = [
    count(result.bookmarks.length, 'saved recipe', 'saved recipes'),
    count(result.collections.length, 'collection', 'collections'),
    count(result.recipes.length, 'recipe of your own', 'recipes of your own'),
    count(result.cooks.length, 'cooked dish', 'cooked dishes'),
    count(result.hidden.length, 'hidden dish', 'hidden dishes'),
    count(result.cupboard.length, 'cupboard item', 'cupboard items'),
  ].filter((p): p is string => p !== undefined);

  const sentences: string[] = [];
  if (brought.length) sentences.push(`We brought over ${join(brought)}.`);

  // A recipe with no cuisine stays a draft (domain/recipes/draft.ts), so it and
  // anything pointing at it don't show up everywhere until one is picked (audit F10).
  const needCuisine = result.recipes.filter((r) => !r.draft.cuisine).length;
  if (needCuisine === 1) sentences.push('One of your recipes needs a cuisine before it shows up everywhere: pick one in My recipes.');
  else if (needCuisine > 1)
    sentences.push(`${needCuisine} of your recipes need a cuisine before they show up everywhere: pick one in My recipes.`);

  const gone = result.dropped;
  if (gone === 1) sentences.push('One dish is no longer in the app, so it was left behind.');
  else if (gone > 1) sentences.push(`${gone} dishes are no longer in the app, so they were left behind.`);

  const missed = result.cupboardMissed;
  if (missed.length) {
    const names = missed.length > 3 ? `${missed.slice(0, 3).join(', ')} and ${missed.length - 3} more` : join(missed);
    sentences.push(`We couldn’t match ${names} from your cupboard, so ${missed.length === 1 ? 'add it' : 'add them'} again.`);
  }

  return sentences.length ? `Welcome back. ${sentences.join(' ')}` : undefined;
}
