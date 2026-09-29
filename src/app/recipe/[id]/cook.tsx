import { useLocalSearchParams } from 'expo-router';

import { CookScreen } from '@/features/cook/CookScreen';

export default function CookRoute() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  return <CookScreen id={id} servings={servings ? Number(servings) : undefined} />;
}
