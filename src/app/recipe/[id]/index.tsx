import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/features/recipe/RecipeScreen';

export default function RecipeRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <RecipeScreen id={id} servings={servings} />;
}
