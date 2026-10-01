// One collection (v1's drill-in view): the library head with the collection's
// name and count, its recipes as cream cards, and a "⋯" chip for rename and
// delete. Deleting goes back to the list, where Undo can bring it back.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goBack, goToTab } from '@/lib/navigation';
import { useSaved, type Collection } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryCardGrid } from '@/ui/patterns/LibraryCard';
import { LibraryHead } from '@/ui/patterns/LibraryHeader';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { CollectionActions } from './CollectionActions';
import { imageFor, RECIPES_UNIT, useOpenRecipe, useRecipesFor } from './libraryHooks';

export function CollectionScreen({ id }: { id: string }) {
  const router = useRouter();
  const open = useOpenRecipe();
  const current = useSaved((s) => s.collections.find((c) => c.id === id));
  // After Delete the screen is on its way out: keep drawing what was there rather
  // than flashing "This collection is gone" during the back animation.
  const [leaving, setLeaving] = useState<Collection | undefined>();
  const collection = current ?? leaving;
  const recipes = useRecipesFor()(collection?.recipeIds ?? []);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!collection) {
    return (
      <Screen testID="collection-screen">
        <View>
          <LibraryHead kicker="Collection" title="Not found" count={0} unit={RECIPES_UNIT} />
          <EmptyState
            look="library"
            title="This collection is gone"
            body="It may have been deleted."
            action={{ label: 'Back to collections', onPress: () => goBack(router) }}
            testID="collection-missing"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="collection-screen">
      <View>
        <LibraryHead
          kicker="Collection"
          title={collection.name}
          count={recipes.length}
          unit={RECIPES_UNIT}
          action={
            <IconButton icon="more" label="Collection actions" shape="chip" onPress={() => setActionsOpen(true)} testID="collection-more" />
          }
        />
        {recipes.length ? (
          <LibraryCardGrid recipes={recipes} imageFor={imageFor} onOpen={open} />
        ) : (
          <EmptyState
            look="library"
            title="This collection is empty"
            body="Add recipes from any recipe page: tap ⋯, then Add to a collection."
            action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
            testID="collection-empty"
          />
        )}
      </View>
      <CollectionActions
        id={actionsOpen ? id : null}
        onClose={() => setActionsOpen(false)}
        onDeleted={() => {
          setLeaving(current);
          goBack(router);
        }}
      />
    </Screen>
  );
}
