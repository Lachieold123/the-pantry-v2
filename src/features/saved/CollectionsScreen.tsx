// Collections: v1's "Your shelves" (CollectionsModal, `light-18`). The library
// head, an outlined "+ New collection" pill that opens a centred naming
// dialog, then a 2×2 photo mosaic per collection. Long press for actions.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSaved } from '@/store/saved';
import { CollectionMosaicGrid, type MosaicItem } from '@/ui/patterns/CollectionMosaic';
import { CollectionNameDialog } from '@/ui/patterns/CollectionNameDialog';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryHead } from '@/ui/patterns/LibraryHeader';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { LIBRARY } from '@/ui/tokens/library';
import { CollectionActions, nameProblem } from './CollectionActions';
import { imageFor, useRecipesFor } from './libraryHooks';
import { useAllowance } from '@/store/pro';

export function CollectionsScreen() {
  const router = useRouter();
  const collections = useSaved((s) => s.collections);
  const createCollection = useSaved((s) => s.createCollection);
  const allowed = useAllowance();
  const recipesFor = useRecipesFor();
  const [creating, setCreating] = useState(false);
  const [actionsFor, setActionsFor] = useState<string | null>(null);

  const items: MosaicItem[] = collections.map((c) => {
    const recipes = recipesFor(c.recipeIds);
    return { id: c.id, name: c.name, count: recipes.length, photos: recipes.slice(0, 4).map((r) => imageFor(r.id)) };
  });

  return (
    <Screen testID="collections-screen">
      <View>
        <LibraryHead kicker="Collections" title="Your shelves" count={collections.length} unit={['collection', 'collections']} />
        <View style={{ paddingTop: LIBRARY.actionsTop, paddingBottom: LIBRARY.actionsBottom }}>
          <Button label="New collection" icon="add" onPress={() => allowed('collections') && setCreating(true)} testID="collections-new" />
        </View>
        {items.length ? (
          <CollectionMosaicGrid
            items={items}
            onOpen={(id) => router.push({ pathname: '/collections/[id]', params: { id } })}
            onActions={setActionsFor}
          />
        ) : (
          <EmptyState
            look="library"
            title="No collections yet"
            body="Group recipes your way: weeknights, for guests, the ones the kids will eat. Start one above, or from any recipe's ⋯ menu."
            testID="collections-empty"
          />
        )}
      </View>
      <CollectionNameDialog
        visible={creating}
        title="New collection"
        confirmLabel="Create"
        problem={(name) => nameProblem(collections, name)}
        onSubmit={(name) => {
          createCollection(name);
          setCreating(false);
        }}
        onClose={() => setCreating(false)}
      />
      <CollectionActions id={actionsFor} onClose={() => setActionsFor(null)} />
    </Screen>
  );
}
