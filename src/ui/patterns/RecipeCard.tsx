// How a recipe appears in lists: large (feature), medium (grid) or row.
// Every card opens its recipe; nothing on it is decoration-only.
import { Pressable, View } from 'react-native';

import { formatMinutes, CUISINE_LABELS } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CUISINE_TONES } from '@/ui/tokens/colour';
import { SPACE } from '@/ui/tokens/type';
import { RecipeImage } from './RecipeImage';

type Props = { recipe: Recipe; image: number | undefined; size: 'large' | 'medium' | 'row'; onPress: () => void; note?: string };

export function RecipeCard({ recipe, image, size, onPress, note }: Props) {
  const { name } = useTheme();
  const cuisine = CUISINE_LABELS[recipe.cuisine];
  const tone = CUISINE_TONES[recipe.cuisine]?.[name];
  const meta = note ?? `${formatMinutes(totalMinutes(recipe))} · Serves ${recipe.servings}`;
  const label = `${recipe.title}, ${cuisine}, ${meta}`;

  if (size === 'row') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({ flexDirection: 'row', gap: SPACE.md, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ width: 72 }}>
          <RecipeImage source={image} shape="thumb" initial={cuisine.charAt(0)} radius={8} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="kicker" tone={tone}>
            {cuisine}
          </Text>
          <Text variant="heading" numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text variant="meta">{meta}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ gap: SPACE.xs, opacity: pressed ? 0.8 : 1 })}
    >
      <RecipeImage source={image} shape={size === 'large' ? 'hero' : 'card'} initial={cuisine.charAt(0)} />
      <View style={{ gap: 2, paddingTop: SPACE.xxs }}>
        <Text variant="kicker" tone={tone}>
          {cuisine}
        </Text>
        <Text variant={size === 'large' ? 'title' : 'heading'} numberOfLines={size === 'large' ? 3 : 2}>
          {recipe.title}
        </Text>
        {size === 'large' && recipe.summary ? (
          <Text variant="body" colour="inkSecondary" numberOfLines={3}>
            {recipe.summary}
          </Text>
        ) : null}
        <Text variant="meta">{meta}</Text>
      </View>
    </Pressable>
  );
}
