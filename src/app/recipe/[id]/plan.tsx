import { useLocalSearchParams } from 'expo-router';

import { PlanRecipeSheet } from '@/features/recipe/PlanRecipeSheet';

export default function PlanRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanRecipeSheet id={id} />;
}
