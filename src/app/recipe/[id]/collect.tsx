import { useLocalSearchParams } from 'expo-router';

import { CollectSheet } from '@/features/recipe/CollectSheet';

export default function CollectRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CollectSheet id={id} />;
}
