// Testing the Home engine: rank Home as yourself, or as one of the AI cooks
// (their real follows come from the server, read only). Your cupboard, diet
// and logged events still apply either way.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { goBack } from '@/lib/navigation';
import { fetchCookList } from '@/lib/homeFeedReads';
import { problemWords } from '@/lib/published';
import { useRead } from '@/lib/usePublished';
import { useHomeEvents } from '@/store/homeEvents';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

export function HomeViewerScreen() {
  const router = useRouter();
  const cooks = useRead(fetchCookList, 'all');
  const asCookId = useHomeEvents((s) => s.asCookId);
  const setAsCook = useHomeEvents((s) => s.setAsCook);
  const choose = (id: string | undefined) => {
    setAsCook(id);
    goBack(router);
  };
  return (
    <Screen testID="home-viewer-screen">
      <PushedHeader kicker="Testing" title="Rank Home as" onBack={() => goBack(router)} />
      <View style={{ gap: SPACE.sm }}>
        <ListRow
          title="Me"
          detail="Your own follows and events"
          {...(asCookId ? {} : { value: 'Current' })}
          onPress={() => choose(undefined)}
          testID="home-viewer-me"
        />
        {cooks.state === 'loading' ? <Text variant="meta">Loading cooks…</Text> : null}
        {cooks.state === 'error' ? (
          <View style={{ gap: SPACE.sm }}>
            <Text variant="body" colour="inkSoft">
              {problemWords(cooks.problem)}
            </Text>
            <Button label="Try again" kind="soft" onPress={cooks.retry} testID="home-viewer-retry" />
          </View>
        ) : null}
        {cooks.state === 'ready'
          ? cooks.value.map((c) => (
              <ListRow
                key={c.id}
                title={c.displayName}
                detail={`@${c.handle} · follows ${c.followingCount}`}
                {...(c.id === asCookId ? { value: 'Current' } : {})}
                onPress={() => choose(c.id)}
                testID={`home-viewer-${c.handle}`}
              />
            ))
          : null}
      </View>
    </Screen>
  );
}
