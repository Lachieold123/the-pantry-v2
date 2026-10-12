// A paged, virtualised list of published recipes (plan rule 12), used by the
// full feed and a cook's profile. The footer says what's happening: loading
// more, a retry after a failure, or the end.
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { problemWords } from '@/lib/published';
import type { Feed } from '@/lib/usePublished';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FEED } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PublishedCard } from './PublishedCard';

type Props = {
  feed: Feed;
  header: ReactElement;
  emptyTitle: string;
  emptyBody: string;
  /** False on a cook's profile, where every card is theirs. */
  linkCooks?: boolean;
  testID: string;
};

export function PublishedList({ feed, header, emptyTitle, emptyBody, linkCooks = true, testID }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const open = (id: string) => router.push({ pathname: '/feed/[id]', params: { id } });
  const openCook = (id: string) => router.push({ pathname: '/cooks/[id]', params: { id } });
  const firstLoad = feed.items.length === 0;

  const footer = () => {
    if (feed.loading || feed.loadingMore)
      return <ActivityIndicator color={colours.inkMuted} style={{ marginVertical: SPACE.lg }} testID="feed-loading" />;
    if (feed.problem)
      return (
        <View style={{ alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.lg }} testID="feed-error">
          <Text variant="body" colour="inkSoft" align="center">
            {problemWords(feed.problem)}
          </Text>
          <Button label="Try again" kind="soft" onPress={firstLoad ? feed.refresh : feed.loadMore} testID="feed-retry" />
        </View>
      );
    if (firstLoad) return <EmptyState title={emptyTitle} body={emptyBody} testID="feed-empty" />;
    if (!feed.hasMore)
      return (
        <Text variant="metaSmall" align="center" style={{ marginVertical: SPACE.lg }} testID="feed-end">
          That’s everything for now.
        </Text>
      );
    return null;
  };

  return (
    <FlatList
      testID={testID}
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + SPACE.md,
        paddingHorizontal: SPACE.gutter,
        paddingBottom: insets.bottom + SPACE.xxl,
        gap: SPACE.lg,
      }}
      data={feed.items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PublishedCard item={item} onOpen={open} onCook={linkCooks ? openCook : undefined} />}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={FEED.endThreshold}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colours.inkMuted} />}
      initialNumToRender={4}
      windowSize={7}
      removeClippedSubviews
    />
  );
}
