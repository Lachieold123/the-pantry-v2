// Cookmarks, the library's first tab: v1's "Saved" page (CookmarksModal,
// `light-17`) without its own head. Saved recipes as cream cards, newest
// first. The disc on each photo unsaves it, with Undo in case of a slip.
// The cards themselves are rows of the library's virtualised list (REL-14);
// this file holds what they need and the empty state.
import { useRouter } from 'expo-router';

import type { Recipe } from '@/domain/recipes/types';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { useToast } from '@/ui/patterns/Toast';
import { useRecipesFor } from './libraryHooks';

/** What the library's head counts on this tab: saved recipes that still exist. */
export function useCookmarkCount(): number {
  const bookmarks = useSaved((s) => s.bookmarks);
  return useRecipesFor()(bookmarks.map((b) => b.recipeId)).length;
}

/** The saved recipes, and unsaving one with Undo. */
export function useCookmarks(): { recipes: Recipe[]; unsave: (recipe: Recipe) => void } {
  const toast = useToast();
  const bookmarks = useSaved((s) => s.bookmarks);
  const toggle = useSaved((s) => s.toggleBookmark);
  const restore = useSaved((s) => s.restoreBookmark);
  const recipes = useRecipesFor()(bookmarks.map((b) => b.recipeId));
  const unsave = (recipe: Recipe) => {
    const bookmark = bookmarks.find((b) => b.recipeId === recipe.id);
    toggle(recipe.id);
    if (bookmark) toast({ message: 'Removed from Cookmarks', undo: () => restore(bookmark) });
  };
  return { recipes, unsave };
}

export function CookmarksEmpty() {
  const router = useRouter();
  return (
    <EmptyState
      look="library"
      title="Nothing saved yet"
      body="Tap the bookmark on any recipe to keep it here."
      action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
      testID="cookmarks-empty"
    />
  );
}
