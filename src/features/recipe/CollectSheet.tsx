// Add a recipe to one or more collections, or start a new one.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useRecipe, useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Divider } from '@/ui/primitives/Divider';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { goBack } from '@/lib/navigation';

export function CollectSheet({ id }: { id: string }) {
  const router = useRouter();
  const recipe = useRecipe(id);
  // Count what the collection page will show, not ids of recipes that are gone.
  const getRecipe = useRecipeLookup();
  const collections = useSaved((s) => s.collections);
  const toggleInCollection = useSaved((s) => s.toggleInCollection);
  const createCollection = useSaved((s) => s.createCollection);
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const duplicate = collections.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const create = () => {
    if (!trimmed || duplicate) return;
    const newId = createCollection(trimmed);
    toggleInCollection(newId, id);
    setName('');
  };

  return (
    <Sheet title="Add to collection" onClose={() => goBack(router)}>
      {recipe ? <Text variant="meta">{recipe.title}</Text> : null}
      {collections.length === 0 ? (
        <Text variant="body" colour="inkSoft">
          No collections yet. Name your first one below.
        </Text>
      ) : (
        <View>
          {collections.map((c) => (
            <View key={c.id}>
              <Checkbox
                label={c.name}
                detail={`${c.recipeIds.filter((r) => getRecipe(r) !== undefined).length}`}
                checked={c.recipeIds.includes(id)}
                onToggle={() => toggleInCollection(c.id, id)}
                strikeWhenChecked={false}
                testID={`collect-row-${c.id}`}
              />
              <Divider />
            </View>
          ))}
        </View>
      )}
      <View style={{ gap: SPACE.sm }}>
        <TextField
          label="New collection"
          placeholder="Name your collection"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={create}
          maxLength={40}
          testID="collect-new-name"
          {...(duplicate && trimmed ? { error: 'You already have a collection with that name.' } : {})}
        />
        <Button label="Create and add" onPress={create} disabled={!trimmed || duplicate} testID="collect-create" />
      </View>
    </Sheet>
  );
}
