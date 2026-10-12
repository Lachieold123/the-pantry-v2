// Every recipe other cooks have published, newest first (D-026's feed; read
// only for now: no likes, comments or follows until P9's moderation is in).
import { useFeed } from '@/lib/usePublished';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { PublishedList } from './PublishedList';

export function CommunityFeedScreen() {
  const feed = useFeed();
  return (
    <PublishedList
      feed={feed}
      header={<PushedHeader kicker="From other cooks" title="What they’re cooking" />}
      emptyTitle="Nothing shared yet"
      emptyBody="When cooks publish their recipes, they’ll show up here."
      testID="community-feed"
    />
  );
}
