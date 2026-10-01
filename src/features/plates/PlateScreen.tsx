// One of your plates, opened from Home: the photos to swipe, what it was,
// your words, and the recipe it came from. Removing it can be undone.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { plateMeta } from '@/domain/plates/plate';
import { shortDate } from '@/lib/dates';
import { goBack } from '@/lib/navigation';
import { usePlates } from '@/store/plates';
import { useRecipeLookup } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { RADIUS, SPACE } from '@/ui/tokens/type';

export function PlateScreen({ id }: { id: string | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const plate = usePlates((s) => s.plates.find((p) => p.id === id));
  const remove = usePlates((s) => s.remove);
  const restore = usePlates((s) => s.restore);
  const getRecipe = useRecipeLookup();
  const [width, setWidth] = useState(0);

  if (!plate) {
    return (
      <Screen>
        <EmptyState
          title="That plate is gone"
          body="It may have been removed."
          action={{ label: 'Back', onPress: () => goBack(router) }}
          testID="plate-missing"
        />
      </Screen>
    );
  }
  const recipe = plate.recipeId ? getRecipe(plate.recipeId) : undefined;

  return (
    <Screen testID="plate-screen">
      <PushedHeader kicker={`Your plate · ${shortDate(new Date(plate.createdAt))}`} title={plate.title} />
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE.gutter }}>
            {plate.photoUris.map((uri) => (
              <View key={uri} style={{ width: width + SPACE.gutter * 2, paddingHorizontal: SPACE.gutter }}>
                <RecipeImage source={{ uri }} shape="portrait" cuisine="modern-australian" radius={RADIUS.card} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {plate.photoUris.length > 1 ? <Text variant="meta">{`${plate.photoUris.length} photos. Swipe for more.`}</Text> : null}
      <Text variant="meta" colour="inkSoft">
        {plateMeta(plate)}
      </Text>
      {plate.caption ? <Text variant="body">{plate.caption}</Text> : null}
      {recipe ? (
        <Button
          label={`Open the recipe: ${recipe.title}`}
          icon="cook"
          kind="soft"
          block
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
          testID="plate-recipe"
        />
      ) : null}
      <Text variant="meta">Only you can see your plates for now. Sharing with friends comes with accounts.</Text>
      <Button
        label="Remove this plate"
        kind="quiet"
        onPress={() => {
          const gone = remove(plate.id);
          if (gone) toast({ message: `${gone.title} removed`, undo: () => restore(gone) });
          goBack(router);
        }}
        testID="plate-remove"
      />
    </Screen>
  );
}
