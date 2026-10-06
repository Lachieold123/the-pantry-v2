// Every recipe the app knows: the bundled catalogue plus your own. Screens
// look recipes up here so a recipe you wrote can be planned, shopped for,
// cooked and saved exactly like a built-in one.
import { CATALOGUE, getCatalogueRecipe, INGREDIENTS } from '@/data/catalogue/catalogue';
import { buildRecipe, type BuiltDraft } from '@/domain/recipes/draft';
import type { Recipe } from '@/domain/recipes/types';
import { useHousehold } from './household';
import { useMyRecipes, type MyRecipe } from './myRecipes';

export type MyRecipeView = MyRecipe & BuiltDraft;

type Book = { mine: MyRecipeView[]; get: (id: string) => Recipe | undefined; all: readonly Recipe[] };

// Parsing is cheap but not free, so the book is rebuilt only when your recipes change.
let cache: { source: Record<string, MyRecipe>; shared: Record<string, MyRecipe>; book: Book } | undefined;

/**
 * `shared` is other household members' own recipes that the shared plan uses
 * (D-039): they can be looked up (planned, shopped for, cooked) but aren't
 * listed as yours.
 */
function bookFor(recipes: Record<string, MyRecipe>, shared: Record<string, MyRecipe>): Book {
  if (cache?.source === recipes && cache.shared === shared) return cache.book;
  const mine = Object.values(recipes)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => ({ ...r, ...buildRecipe(r.id, r.draft, r.source, INGREDIENTS) }));
  const complete = mine.flatMap((m) => (m.recipe ? [m.recipe] : []));
  const byId = new Map(complete.map((r) => [r.id, r]));
  const theirs = new Map(
    Object.values(shared)
      .filter((r) => !recipes[r.id])
      .flatMap((r) => {
        const built = buildRecipe(r.id, r.draft, r.source, INGREDIENTS).recipe;
        return built ? [[r.id, built] as const] : [];
      }),
  );
  const book: Book = { mine, get: (id) => getCatalogueRecipe(id) ?? byId.get(id) ?? theirs.get(id), all: [...complete, ...CATALOGUE] };
  cache = { source: recipes, shared, book };
  return book;
}

/** For code outside React (and inside callbacks). */
export function getRecipe(id: string): Recipe | undefined {
  return bookFor(useMyRecipes.getState().recipes, useHousehold.getState().sharedRecipes).get(id);
}

function useBook(): Book {
  return bookFor(
    useMyRecipes((s) => s.recipes),
    useHousehold((s) => s.sharedRecipes),
  );
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

/** Your recipes, finished or not, newest edit first. */
export function useMyRecipeList(): MyRecipeView[] {
  return useBook().mine;
}
