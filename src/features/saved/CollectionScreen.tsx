// One collection: its recipes, rename it, or delete it (with undo).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Recipe } from '@/domain/recipes/types';
import { goBackOr, goToTab } from '@/lib/navigation';
import { useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { RecipeRows } from './SavedLists';

export function CollectionScreen({ id }: { id: string }) {
  const getRecipe = useRecipeLookup();
  const router = useRouter();
  const toast = useToast();
  const collection = useSaved((s) => s.collections.find((c) => c.id === id));
  const collections = useSaved((s) => s.collections);
  const rename = useSaved((s) => s.renameCollection);
  const del = useSaved((s) => s.deleteCollection);
  const restore = useSaved((s) => s.restoreCollection);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection?.name ?? '');

  if (!collection) {
    return (
      <Screen>
        <IconButton icon="back" label="Back" onPress={() => goBackOr(router)} testID="back" />
        <EmptyState
          title="This collection is gone"
          body="It may have been deleted."
          action={{ label: 'Back to Saved', onPress: () => goBackOr(router) }}
          testID="collection-missing"
        />
      </Screen>
    );
  }

  const trimmed = name.trim();
  const clash = collections.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase());
  const recipes = collection.recipeIds.map(getRecipe).filter((r): r is Recipe => r !== undefined);

  return (
    <Screen testID="collection-screen">
      <IconButton icon="back" label="Back" onPress={() => goBackOr(router)} testID="back" />
      <TitleBlock kicker="Collection" title={collection.name} />
      {editing ? (
        <View style={{ gap: SPACE.sm }}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
            testID="collection-name"
            {...(clash ? { error: 'You already have a collection with that name.' } : {})}
          />
          <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
            <Button
              label="Save name"
              kind="primary"
              disabled={!trimmed || clash}
              onPress={() => {
                rename(id, trimmed);
                setEditing(false);
              }}
              testID="collection-save-name"
            />
            <Button
              label="Cancel"
              kind="quiet"
              onPress={() => {
                setName(collection.name);
                setEditing(false);
              }}
              testID="collection-cancel-rename"
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
          <Button label="Rename" onPress={() => setEditing(true)} testID="collection-rename" />
          <Button
            label="Delete"
            kind="destructive"
            onPress={() => {
              const removed = del(id);
              goBackOr(router);
              if (removed) toast({ message: `${removed.name} deleted`, undo: () => restore(removed) });
            }}
            testID="collection-delete"
          />
        </View>
      )}
      {recipes.length ? (
        <RecipeRows recipes={recipes} />
      ) : (
        <EmptyState
          title="Nothing in here yet"
          body="Open any recipe and tap Add to collection."
          action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
          testID="collection-empty"
        />
      )}
    </Screen>
  );
}
