// Saved: bookmarks, collections, your own recipes and what you've cooked.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { MineList } from './MineList';
import { BookmarksList, CollectionsList, CookedList } from './SavedLists';

type Segment = 'bookmarks' | 'collections' | 'mine' | 'cooked';
const SEGMENTS = [
  { value: 'bookmarks', label: 'Saved' },
  { value: 'collections', label: 'Collections' },
  { value: 'mine', label: 'Mine' },
  { value: 'cooked', label: 'Cooked' },
] as const;

export function SavedScreen() {
  // Other screens can open a particular list, e.g. after deleting one of your recipes.
  const { show } = useLocalSearchParams<{ show?: string }>();
  const asked = SEGMENTS.find((s) => s.value === show)?.value;
  const [segment, setSegment] = useState<Segment>(asked ?? 'bookmarks');
  // The tab stays mounted, so a later request to show a list is applied as it arrives.
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    if (asked) setSegment(asked);
  }
  return (
    <Screen>
      <TitleBlock title="Saved" />
      <Segmented<Segment> label="Show" options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'bookmarks' ? <BookmarksList /> : null}
      {segment === 'collections' ? <CollectionsList /> : null}
      {segment === 'mine' ? <MineList /> : null}
      {segment === 'cooked' ? <CookedList /> : null}
    </Screen>
  );
}
