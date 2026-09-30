import { useLocalSearchParams } from 'expo-router';

import { PlanRecipeSheet } from '@/features/recipe/PlanRecipeSheet';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function PlanRecipeRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <PlanRecipeSheet id={id} servings={servings} />;
}
