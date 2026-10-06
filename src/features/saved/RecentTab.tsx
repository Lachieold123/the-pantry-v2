// Recent, the library's last tab: v1's "RECENTS" page
// (FilteredMealsModal, `light-20`) without its own head. A "Clear" soft pill
// (with Undo), then the bordered recipe cards two to a row, most recent
// first. Unlike v1, an odd last card keeps its width instead of stretching
// across both columns.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useBookmarks, useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { SPACE } from '@/ui/tokens/type';
import { imageFor, useOpenRecipe, useRecipesFor } from './libraryHooks';

/** What the library's head counts on this tab: viewed recipes that still exist. */
export function useRecentCount(): number {
  const recent = useSaved((s) => s.recentlyViewed);
  return useRecipesFor()(recent).length;
}

export function RecentTab() {
  const router = useRouter();
  const toast = useToast();
  const open = useOpenRecipe();
  const recent = useSaved((s) => s.recentlyViewed);
  const clearRecent = useSaved((s) => s.clearRecent);
  const restoreRecent = useSaved((s) => s.restoreRecent);
  const bookmarks = useBookmarks();
  const recipes = useRecipesFor()(recent);

  const clear = () => {
    const cleared = clearRecent();
    toast({ message: 'Recent list cleared', undo: () => restoreRecent(cleared) });
  };

  if (!recipes.length) {
    return (
      <View testID="recent-screen">
        <EmptyState
          title="Nothing viewed yet"
          body="Recipes you open show up here, so the one you were looking at is easy to find again."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
          testID="recent-empty"
        />
      </View>
    );
  }

  return (
    <View testID="recent-screen" style={{ gap: SPACE.md }}>
      {/* Clear sits at the end of the row, away from the cards, so it isn't tapped by accident. */}
      <View style={{ alignItems: 'flex-end' }}>
        <Button label="Clear" kind="soft" onPress={clear} accessibilityHint="Empties this list" testID="recent-clear" />
      </View>
      <RecipeGrid recipes={recipes} imageFor={imageFor} onOpen={open} isSaved={bookmarks.isSaved} onToggleSave={bookmarks.toggle} />
    </View>
  );
}
