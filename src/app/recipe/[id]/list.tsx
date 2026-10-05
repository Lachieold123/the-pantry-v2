import { useLocalSearchParams } from 'expo-router';

import { AddToListSheet } from '@/features/recipe/AddToListSheet';

export default function AddToListRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  const n = Number(servings);
  return <AddToListSheet id={id} servings={Number.isFinite(n) && n > 0 ? n : undefined} />;
}
