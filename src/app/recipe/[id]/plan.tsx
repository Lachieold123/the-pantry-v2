import { useLocalSearchParams } from 'expo-router';

import { PlanRecipeSheet } from '@/features/recipe/PlanRecipeSheet';

export default function PlanRecipeRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <PlanRecipeSheet id={id} servings={servings} />;
}
