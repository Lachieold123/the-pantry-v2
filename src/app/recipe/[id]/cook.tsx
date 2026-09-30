import { useLocalSearchParams } from 'expo-router';

import { CookScreen } from '@/features/cook/CookScreen';

export default function CookRoute() {
  // Passed through raw: CookScreen checks it, as a link can carry anything (audit F52).
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <CookScreen id={id} servings={servings} />;
}
