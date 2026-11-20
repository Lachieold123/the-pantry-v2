// "From other cooks" on Home: the newest few published recipes, and a way into
// the full feed (D-027: posts join below Home's own picks). It loads quietly;
// if the server can't be reached it says so once, with a retry, and Home's own
// recipes are unaffected.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { problemWords } from '@/lib/published';
import { useFeed } from '@/lib/usePublished';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { FEED, HOME } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PublishedCard } from './PublishedCard';

export function CommunityRail() {
  const router = useRouter();
  const feed = useFeed();
  const shown = feed.items.slice(0, FEED.homeCount);
  // Nothing published at all: no section, rather than an empty promise.
  if (!feed.loading && !feed.problem && shown.length === 0) return null;
  return (
    <View testID="home-community" style={{ marginBottom: HOME.afterCarousel, gap: SPACE.md }}>
      <SectionHeader kicker="From other cooks" tone="accent" title="What they’re cooking" />
      {feed.loading ? (
        <Text variant="meta" testID="home-community-loading">
          Loading recipes from other cooks…
        </Text>
      ) : feed.problem && shown.length === 0 ? (
        <View style={{ gap: SPACE.sm }} testID="home-community-error">
          <Text variant="body" colour="inkSoft">
            {problemWords(feed.problem)}
          </Text>
          <Button label="Try again" kind="soft" onPress={feed.refresh} testID="home-community-retry" />
        </View>
      ) : (
        <>
          {shown.map((item) => (
            <PublishedCard
              key={item.id}
              item={item}
              onOpen={(id) => router.push({ pathname: '/feed/[id]', params: { id } })}
              onCook={(id) => router.push({ pathname: '/cooks/[id]', params: { id } })}
            />
          ))}
          <Button label="See more from other cooks" kind="soft" block onPress={() => router.push('/feed')} testID="home-community-more" />
        </>
      )}
    </View>
  );
}
