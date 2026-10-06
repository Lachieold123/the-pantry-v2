// Cookmarks, the library's first tab: v1's "Saved" page (CookmarksModal,
// `light-17`) without its own head. Saved recipes as cream cards, newest
// first. The disc on each photo unsaves it, with Undo in case of a slip.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryCardGrid } from '@/ui/patterns/LibraryCard';
import { useToast } from '@/ui/patterns/Toast';
import { imageFor, useOpenRecipe, useRecipesFor } from './libraryHooks';

/** What the library's head counts on this tab: saved recipes that still exist. */
export function useCookmarkCount(): number {
  const bookmarks = useSaved((s) => s.bookmarks);
  return useRecipesFor()(bookmarks.map((b) => b.recipeId)).length;
}

export function CookmarksTab() {
  const router = useRouter();
  const toast = useToast();
  const open = useOpenRecipe();
  const bookmarks = useSaved((s) => s.bookmarks);
  const toggle = useSaved((s) => s.toggleBookmark);
  const restore = useSaved((s) => s.restoreBookmark);
  const recipes = useRecipesFor()(bookmarks.map((b) => b.recipeId));

  const unsave = (recipeId: string) => {
    const bookmark = bookmarks.find((b) => b.recipeId === recipeId);
    toggle(recipeId);
    if (bookmark) toast({ message: 'Removed from Cookmarks', undo: () => restore(bookmark) });
  };

  return (
    <View testID="cookmarks-screen">
      {recipes.length ? (
        <LibraryCardGrid recipes={recipes} imageFor={imageFor} onOpen={open} onUnsave={(r) => unsave(r.id)} />
      ) : (
        <EmptyState
          look="library"
          title="Nothing saved yet"
          body="Tap the bookmark on any recipe to keep it here."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
          testID="cookmarks-empty"
        />
      )}
    </View>
  );
}
