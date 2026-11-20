// "What can I cook with what I have?", wired to the cupboard and to what this
// cook eats. Every screen that shows cupboard matches reads it from here, so
// they always agree. Diet, the avoid list and "not for us" always apply (the
// old Cupboard and Browse sections ignored them: a vegetarian saw chicken).
import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { quickAdds, whatCanICook, type CookableMatch } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { savedMatches, suggestedMatches, type SavedMatch } from '@/domain/cupboard/shelves';
import { useToday } from '@/lib/today';
import { NO_FILTERS } from '@/domain/recipes/search';
import { eligibleForSurprise } from '@/domain/suggestions/surprise';
import { useCupboard } from './cupboard';
import { usePreferences } from './preferences';
import { useAllRecipes } from './recipeBook';
import { useSaved } from './saved';

export type CookableNow = {
  ready: CookableMatch[];
  nearly: CookableMatch[];
  /** Ingredients worth adding next, from what this cook's recipes use most. */
  quick: string[];
  have: ReadonlySet<string>;
  /** The Cupboard's "From your saved": Cookmarks that use something you have, closest first. */
  fromSaved: SavedMatch[];
  /** The Cupboard's "Suggested for you": ready, then nearly, minus what fromSaved shows. */
  suggested: CookableMatch[];
};

export function useCookableNow(): CookableNow {
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  const bookmarks = useSaved((s) => s.bookmarks);
  const recipes = useAllRecipes();
  const today = useToday();
  return cookableFor([items, shelf, diet, avoid, hidden, bookmarks, recipes, today]);
}

type Cupboard = ReturnType<typeof useCupboard.getState>;
type Prefs = ReturnType<typeof usePreferences.getState>;
type Saved = ReturnType<typeof useSaved.getState>;
type Inputs = [
  Cupboard['items'],
  Cupboard['shelf'],
  Prefs['diet'],
  Prefs['avoid'],
  Saved['hidden'],
  Saved['bookmarks'],
  ReturnType<typeof useAllRecipes>,
  string,
];

/**
 * One answer shared by every screen that asks (PERF-2): Home, Plan, Cupboard,
 * Browse and Surprise are all mounted at once, and each used to work it out again.
 */
let cache: { inputs: Inputs; value: CookableNow } | undefined;

/** @internal Exported for its test. */
export function cookableFor(inputs: Inputs): CookableNow {
  if (cache && cache.inputs.every((v, i) => v === inputs[i])) return cache.value;
  const value = compute(...inputs);
  cache = { inputs, value };
  return value;
}

function compute(...[items, shelf, diet, avoid, hidden, bookmarks, recipes, today]: Inputs): CookableNow {
  const have = cupboardIds(items);
  const eats = eligibleForSurprise({ recipes, filters: NO_FILTERS, diet, avoid, hidden: new Set(hidden), index: INGREDIENTS });
  const savedIds = [...bookmarks].sort((a, b) => b.savedAt - a.savedAt).map((b) => b.recipeId);
  const { ready, nearly } = whatCanICook({
    recipes: eats,
    have,
    shelf,
    index: INGREDIENTS,
    kitchen: KITCHEN,
    saved: new Set(savedIds),
    seed: today,
  });
  const fromSaved = savedMatches({ recipes: eats, saved: savedIds, have, shelf, index: INGREDIENTS, kitchen: KITCHEN });
  const suggested = suggestedMatches(ready, nearly, fromSaved);
  return { ready, nearly, quick: quickAdds(eats, have, INGREDIENTS, KITCHEN), have, fromSaved, suggested };
}

/** The name a cook reads for an ingredient id. */
export function ingredientName(id: string): string {
  // "unknown:salt-cod" is a real thing the database doesn't stock: show its words.
  return INGREDIENTS.byId.get(id)?.name ?? id.replace(/^unknown:/, '').replace(/-/g, ' ');
}
