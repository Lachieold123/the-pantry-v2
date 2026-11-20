import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/features/app/NotFoundScreen';
import { PublishedRecipeScreen } from '@/features/recipe/PublishedRecipeScreen';
import { COMMUNITY_SHOWN } from '@/lib/build';

export default function PublishedRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Other cooks are internal builds only for now (REL2-1).
  if (!COMMUNITY_SHOWN) return <NotFoundScreen />;
  return <PublishedRecipeScreen id={id} />;
}
