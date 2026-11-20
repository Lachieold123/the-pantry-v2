// One collection (v1's drill-in view): the library head with the collection's
// name and count, its recipes as cream cards, and a "⋯" chip for rename and
// delete. Deleting goes back to the list, where Undo can bring it back.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goBack } from '@/lib/navigation';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryCardRow, libraryRowKey, libraryRows } from '@/ui/patterns/LibraryCard';
import { LibraryHead } from '@/ui/patterns/LibraryHeader';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { IconButton } from '@/ui/primitives/IconButton';
import { ListScreen } from '@/ui/primitives/ListScreen';
import { Screen } from '@/ui/primitives/Screen';
import { LIBRARY } from '@/ui/tokens/library';
import { CollectionActions } from './CollectionActions';
import { imageFor, RECIPES_UNIT, useOpenRecipe, useRecipesFor } from './libraryHooks';

export function CollectionScreen({ id }: { id: string }) {
  const router = useRouter();
  const open = useOpenRecipe();
  const collection = useSaved((s) => s.collections.find((c) => c.id === id));
  const recipes = useRecipesFor()(collection?.recipeIds ?? []);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!collection) {
    return (
      // One message, not a "Not found · 0 recipes" head over it (UX-11), as a missing recipe does.
      <Screen testID="collection-screen">
        <PushedHeader title="Collection" />
        <EmptyState
          look="library"
          title="This collection is gone"
          body="It may have been deleted."
          action={{ label: 'Back to collections', onPress: () => goBack(router) }}
          testID="collection-missing"
        />
      </Screen>
    );
  }

  return (
    <>
      <ListScreen
        testID="collection-screen"
        header={
          <View>
            <LibraryHead
              kicker="Collection"
              title={collection.name}
              count={recipes.length}
              unit={RECIPES_UNIT}
              action={
                <IconButton
                  icon="more"
                  label="Collection actions"
                  shape="chip"
                  onPress={() => setActionsOpen(true)}
                  testID="collection-more"
                />
              }
            />
            {recipes.length ? null : (
              <EmptyState
                look="library"
                title="This collection is empty"
                body="Add recipes from any recipe page: tap ⋯, then Add to a collection."
                action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
                testID="collection-empty"
              />
            )}
          </View>
        }
        items={libraryRows(recipes)}
        keyOf={libraryRowKey}
        gap={LIBRARY.gridGap}
        renderItem={(row) => <LibraryCardRow row={row} imageFor={imageFor} onOpen={open} />}
      />
      <CollectionActions id={actionsOpen ? id : null} onClose={() => setActionsOpen(false)} onDeleted={() => goBack(router)} />
    </>
  );
}
