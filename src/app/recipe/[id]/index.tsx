import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/features/recipe/RecipeScreen';

export default function RecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeScreen id={id} />;
}
