// Cookmarks: v1's "Saved" page (CookmarksModal, `light-17`). The library head,
// then saved recipes as cream cards, newest first. The disc on each photo
// unsaves it, with Undo in case of a slip.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { goToTab } from '@/lib/navigation';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryCardGrid } from '@/ui/patterns/LibraryCard';
import { LibraryHead } from '@/ui/patterns/LibraryHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Screen } from '@/ui/primitives/Screen';
import { imageFor, useOpenRecipe, useRecipesFor } from './libraryHooks';

export function CookmarksScreen() {
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
    <Screen testID="cookmarks-screen">
      <View>
        <LibraryHead kicker="Saved" title="Saved" count={recipes.length} unit={['item', 'items']} />
        {recipes.length ? (
          <LibraryCardGrid recipes={recipes} imageFor={imageFor} onOpen={open} onUnsave={(r) => unsave(r.id)} />
        ) : (
          <EmptyState
            look="library"
            title="Nothing saved yet"
            body="Tap the bookmark on any recipe to keep it here."
            action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
            testID="cookmarks-empty"
          />
        )}
      </View>
    </Screen>
  );
}
