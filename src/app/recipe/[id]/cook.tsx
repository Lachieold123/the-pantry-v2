import { useLocalSearchParams } from 'expo-router';

import { CookScreen } from '@/features/cook/CookScreen';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function CookRoute() {
  // Passed through raw: CookScreen checks it, as a link can carry anything (audit F52).
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <CookScreen id={id} servings={servings} />;
}
