import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/features/recipe/RecipeScreen';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function RecipeRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <RecipeScreen id={id} servings={servings} />;
}
