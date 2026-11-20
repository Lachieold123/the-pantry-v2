import { NotFoundScreen } from '@/features/app/NotFoundScreen';
import { CommunityFeedScreen } from '@/features/feed/CommunityFeedScreen';
import { COMMUNITY_SHOWN } from '@/lib/build';

export default function CommunityFeedRoute() {
  // Other cooks are internal builds only for now (REL2-1); a store build answers not-found.
  return COMMUNITY_SHOWN ? <CommunityFeedScreen /> : <NotFoundScreen />;
}
