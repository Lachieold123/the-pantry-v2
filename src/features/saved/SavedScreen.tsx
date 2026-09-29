// Saved: bookmarks, collections and what you've cooked. "Mine" (your own
// recipes) joins when the recipe editor lands, not before (map rule 4).
import { useState } from 'react';

import { Masthead } from '@/ui/patterns/Masthead';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { BookmarksList, CollectionsList, CookedList } from './SavedLists';

type Segment = 'bookmarks' | 'collections' | 'cooked';
const SEGMENTS = [
  { value: 'bookmarks', label: 'Saved' },
  { value: 'collections', label: 'Collections' },
  { value: 'cooked', label: 'Cooked' },
] as const;

export function SavedScreen() {
  const [segment, setSegment] = useState<Segment>('bookmarks');
  return (
    <Screen>
      <Masthead title="Saved" />
      <Segmented<Segment> label="Show" options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'bookmarks' ? <BookmarksList /> : null}
      {segment === 'collections' ? <CollectionsList /> : null}
      {segment === 'cooked' ? <CookedList /> : null}
    </Screen>
  );
}
