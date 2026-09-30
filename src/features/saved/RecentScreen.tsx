// Recently viewed: v1's "RECENTS" page (FilteredMealsModal, `light-20`). The
// pushed head with a count and a "Clear" soft pill (with Undo), then the
// bordered recipe cards two to a row, most recent first. Unlike v1, an odd
// last card keeps its width instead of stretching across both columns.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useBookmarks, useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryPushedHead } from '@/ui/patterns/LibraryHeader';
import { RecipeGrid } from '@/ui/patterns/RecipeGrid';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { SPACE } from '@/ui/tokens/type';
import { imageFor, RECIPES_UNIT, useOpenRecipe, useRecipesFor } from './libraryHooks';

export function RecentScreen() {
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
    toast({ message: 'Recently viewed cleared', undo: () => restoreRecent(cleared) });
  };

  return (
    <Screen testID="recent-screen">
      <View style={{ gap: SPACE.md }}>
        <LibraryPushedHead
          kicker="Recents"
          title={'Recently\nviewed'}
          count={{ value: recipes.length, unit: RECIPES_UNIT }}
          action={
            recipes.length ? (
              <Button label="Clear" kind="soft" onPress={clear} accessibilityHint="Empties this list" testID="recent-clear" />
            ) : null
          }
        />
        {recipes.length ? (
          <RecipeGrid recipes={recipes} imageFor={imageFor} onOpen={open} isSaved={bookmarks.isSaved} onToggleSave={bookmarks.toggle} />
        ) : (
          <EmptyState
            title="Nothing viewed yet"
            body="Recipes you open show up here, so the one you were looking at is easy to find again."
            action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
            testID="recent-empty"
          />
        )}
      </View>
    </Screen>
  );
}
