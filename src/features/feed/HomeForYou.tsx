// Other cooks' recipes on Home, ranked for you by the Home engine
// (docs/HOME-ENGINE.md): cooks you follow first, then what your cupboard can
// make, then what you're likely to enjoy, with each card saying why it's
// there. Replaces the newest-first rail (CommunityRail) on Home.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { RankedItem } from '@/domain/home-engine/types';
import type { FeedItem } from '@/domain/published/published';
import { useHomeEngine } from '@/lib/homeFeed';
import { problemWords } from '@/lib/published';
import { useHomeEvents } from '@/store/homeEvents';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { FEED, HOME } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { HomeTiers } from './HomeTiers';
import { PublishedCard } from './PublishedCard';

/** Test builds can rank Home as one of the AI cooks (Settings has no switch for this). */
const TESTING = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1';

export function HomeForYou() {
  const router = useRouter();
  const engine = useHomeEngine();
  const log = useHomeEvents((s) => s.log);
  const asCookId = useHomeEvents((s) => s.asCookId);
  const [count, setCount] = useState<number>(FEED.rankedPage);
  const open = (id: string, surface = 'home') => {
    log('open', { itemId: id, surface });
    router.push({ pathname: '/feed/[id]', params: { id } });
  };
  const ready = engine.state === 'ready' ? engine.value : undefined;
  const shown = ready ? ready.feed.slice(0, count) : [];
  if (ready && ready.feed.length === 0) return null;

  return (
    <View testID="home-for-you" style={{ marginBottom: HOME.afterCarousel, gap: SPACE.md }}>
      <SectionHeader kicker="From other cooks" tone="accent" title="Picked for you" />
      {TESTING ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
          <Text variant="metaSmall" style={{ flex: 1 }} testID="home-viewing-as">
            {asCookId ? 'Testing: ranked as an AI cook, with their follows' : 'Testing: ranked as you'}
          </Text>
          <Button label="Change" kind="quiet" onPress={() => router.push('/dev/home-viewer')} testID="home-viewing-as-change" />
        </View>
      ) : null}
      {engine.state === 'loading' ? (
        <Text variant="meta" testID="home-for-you-loading">
          Loading recipes from other cooks…
        </Text>
      ) : engine.state === 'error' ? (
        <View style={{ gap: SPACE.sm }} testID="home-for-you-error">
          <Text variant="body" colour="inkSoft">
            {problemWords(engine.problem)}
          </Text>
          <Button label="Try again" kind="soft" onPress={engine.retry} testID="home-for-you-retry" />
        </View>
      ) : (
        <>
          <HomeTiers canCook={ready!.canCook} missingFew={ready!.missingFew} onOpen={(id) => open(id, 'home-tiers')} />
          {shown.map((r) => {
            const card = ready!.rows.get(r.item.id)?.feed;
            return card ? <Ranked key={r.item.id} ranked={r} card={card} onOpen={open} /> : null;
          })}
          {ready!.feed.length > count ? (
            <Button label="Show more" kind="soft" block onPress={() => setCount((c) => c + FEED.rankedPage)} testID="home-for-you-more" />
          ) : null}
        </>
      )}
    </View>
  );
}

function Ranked({ ranked, card, onOpen }: { ranked: RankedItem; card: FeedItem; onOpen: (id: string) => void }) {
  const router = useRouter();
  const log = useHomeEvents((s) => s.log);
  const id = ranked.item.id;
  // Shown once per visit; the log itself ignores a repeat within half an hour.
  useEffect(() => {
    log('impression', { itemId: id, cookId: ranked.item.cookId, surface: 'home' });
  }, [log, id, ranked.item.cookId]);
  return (
    <View style={{ gap: SPACE.xs }}>
      <Text variant="metaSmall" colour="accentText" testID={`home-reason-${id}`}>
        {ranked.explanation}
      </Text>
      <PublishedCard item={card} onOpen={onOpen} onCook={(cookId) => router.push({ pathname: '/cooks/[id]', params: { id: cookId } })} />
      <Button
        label="Not for me"
        kind="quiet"
        onPress={() => log('hide', { itemId: id, cookId: ranked.item.cookId })}
        testID={`home-hide-${id}`}
      />
    </View>
  );
}
