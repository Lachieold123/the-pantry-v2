import { useLocalSearchParams } from 'expo-router';

import { CollectSheet } from '@/features/recipe/CollectSheet';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function CollectRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CollectSheet id={id} />;
}
