import { useLocalSearchParams } from 'expo-router';

import { PublishedRecipeScreen } from '@/features/recipe/PublishedRecipeScreen';

export default function PublishedRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublishedRecipeScreen id={id} />;
}
