// A cook's profile: who they are, their counts (kept by the database) and the
// recipes they've published, newest first. Read only: following comes with P9.
import { View } from 'react-native';

import type { Cook } from '@/domain/published/published';
import { countLabel } from '@/domain/published/published';
import { fetchCook, photoUrl, problemWords } from '@/lib/published';
import { useFeed, useRead } from '@/lib/usePublished';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { Avatar } from '@/ui/primitives/Avatar';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { FEED } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PublishedList } from './PublishedList';

export function CookScreen({ id }: { id: string }) {
  const cook = useRead(fetchCook, id);
  const feed = useFeed(id);

  if (cook.state !== 'ready') {
    return (
      <Screen>
        <PushedHeader title="Cook" />
        {cook.state === 'loading' ? (
          <Text variant="body" colour="inkSoft" testID="cook-loading">
            Loading…
          </Text>
        ) : (
          <View style={{ gap: SPACE.md }} testID="cook-error">
            <EmptyState
              title={cook.problem === 'not-found' ? 'We couldn’t find that cook' : 'Couldn’t load this cook'}
              body={problemWords(cook.problem)}
            />
            {cook.problem === 'not-found' ? null : <Button label="Try again" kind="soft" onPress={cook.retry} testID="cook-retry" />}
          </View>
        )}
      </Screen>
    );
  }

  return (
    <PublishedList
      feed={feed}
      header={<Profile cook={cook.value} />}
      emptyTitle="No recipes yet"
      emptyBody={`${cook.value.displayName} hasn’t published a recipe yet.`}
      linkCooks={false}
      testID="cook-screen"
    />
  );
}

function Profile({ cook }: { cook: Cook }) {
  return (
    <View style={{ gap: SPACE.md }}>
      <PushedHeader kicker={`@${cook.handle}`} title={cook.displayName} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <Avatar name={cook.displayName} size={FEED.profileAvatar} uri={photoUrl('avatars', cook.avatarPath)} />
        <View style={{ flex: 1, gap: SPACE.xxs }}>
          {cook.homeRegion ? <Text variant="meta">{cook.homeRegion}</Text> : null}
          <Text variant="metaSmall" testID="cook-counts">
            {[
              countLabel(cook.recipeCount, 'recipe', 'recipes'),
              countLabel(cook.followerCount, 'follower', 'followers'),
              `${cook.followingCount.toLocaleString('en-AU')} following`,
            ].join(' · ')}
          </Text>
        </View>
      </View>
      {cook.bio ? (
        <Text variant="body" colour="inkSoft">
          {cook.bio}
        </Text>
      ) : null}
    </View>
  );
}
