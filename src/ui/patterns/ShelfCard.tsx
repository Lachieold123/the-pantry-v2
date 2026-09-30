// A "cook by mood" shelf: a 260-wide photo with the shelf's name and count on
// it (spec §4.6). Tapping it shows the recipes on the shelf.
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { FIXED } from '@/ui/tokens/colour';
import { CARD, PRESSED, RADIUS } from '@/ui/tokens/type';
import { PhotoScrim } from './PhotoScrim';
import { RecipeImage } from './RecipeImage';

type Props = { title: string; count: number; image: number | undefined; cuisine: string; onPress: () => void; testID: string };

export function ShelfCard({ title, count, image, cuisine, onPress, testID }: Props) {
  const countText = count === 1 ? '1 recipe' : `${count} recipes`;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countText}`}
      style={({ pressed }) => [{ width: CARD.shelfWidth }, pressed && { opacity: PRESSED.card }]}
    >
      <RecipeImage source={image} shape="card" cuisine={cuisine} radius={RADIUS.card} iconSize={40}>
        <PhotoScrim kind="shelfBottom" />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: CARD.shelfBody, gap: 2 }} pointerEvents="none">
          <Text variant="onPhotoSmall" tone={FIXED.onPhoto} numberOfLines={2}>
            {title}
          </Text>
          <Text variant="meta" tone={FIXED.onPhotoFaint}>
            {countText}
          </Text>
        </View>
      </RecipeImage>
    </Pressable>
  );
}
