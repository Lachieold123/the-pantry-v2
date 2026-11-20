import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/features/app/NotFoundScreen';
import { CookScreen } from '@/features/feed/CookScreen';
import { COMMUNITY_SHOWN } from '@/lib/build';

export default function CookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Other cooks are internal builds only for now (REL2-1).
  if (!COMMUNITY_SHOWN) return <NotFoundScreen />;
  return <CookScreen id={id} />;
}
