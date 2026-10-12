import { useLocalSearchParams } from 'expo-router';

import { CookScreen } from '@/features/feed/CookScreen';

export default function CookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CookScreen id={id} />;
}
