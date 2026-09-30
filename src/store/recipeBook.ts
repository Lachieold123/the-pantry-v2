// Every recipe the app knows: the bundled catalogue plus your own. Screens
// look recipes up here so a recipe you wrote can be planned, shopped for,
// cooked and saved exactly like a built-in one.
import { CATALOGUE, getCatalogueRecipe, INGREDIENTS } from '@/data/catalogue/catalogue';
import { buildRecipe, type BuiltDraft } from '@/domain/recipes/draft';
import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { indexForSearch, type SearchIndex } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useMyRecipes, type MyRecipe } from './myRecipes';

export type MyRecipeView = MyRecipe & BuiltDraft;

type Book = { mine: MyRecipeView[]; get: (id: string) => Recipe | undefined; all: readonly Recipe[]; search: () => SearchIndex };

// Parsing is cheap but not free, so the book is rebuilt only when your recipes change.
let cache: { source: Record<string, MyRecipe>; book: Book } | undefined;

function bookFor(recipes: Record<string, MyRecipe>): Book {
  if (cache?.source === recipes) return cache.book;
  const mine = Object.values(recipes)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => ({ ...r, ...buildRecipe(r.id, r.draft, r.source, INGREDIENTS) }));
  const complete = mine.flatMap((m) => (m.recipe ? [m.recipe] : []));
  const byId = new Map(complete.map((r) => [r.id, r]));
  const all = [...complete, ...CATALOGUE];
  // One search index for Browse and Add to plan, built the first time someone
  // searches rather than at launch, and rebuilt only with the book.
  let index: SearchIndex | undefined;
  const search = () => (index ??= indexForSearch(all, (c) => CUISINE_LABELS[c], INGREDIENTS.byId));
  const book: Book = { mine, get: (id) => getCatalogueRecipe(id) ?? byId.get(id), all, search };
  cache = { source: recipes, book };
  return book;
}

/** For code outside React (and inside callbacks). */
export function getRecipe(id: string): Recipe | undefined {
  return bookFor(useMyRecipes.getState().recipes).get(id);
}

function useBook(): Book {
  return bookFor(useMyRecipes((s) => s.recipes));
}

export function useRecipe(id: string | undefined): Recipe | undefined {
  const book = useBook();
  return id === undefined ? undefined : book.get(id);
}

/** A lookup that re-renders the caller when your recipes change. Stable until they do, so it's safe in hook deps. */
export function useRecipeLookup(): (id: string) => Recipe | undefined {
  return useBook().get;
}

/** Your finished recipes first, then the catalogue. */
export function useAllRecipes(): readonly Recipe[] {
  return useBook().all;
}

/**
 * The search index over `useAllRecipes()`, as a getter so it's built only once
 * someone actually types. Stable until your recipes change, so it's safe in hook deps.
 */
export function useRecipeSearchIndex(): () => SearchIndex {
  return useBook().search;
}

/** Your recipes, finished or not, newest edit first. */
export function useMyRecipeList(): MyRecipeView[] {
  return useBook().mine;
}
