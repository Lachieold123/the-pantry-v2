// Saved: bookmarks, collections, your own recipes and what you've cooked.
import { useState } from 'react';

import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';

type Segment = 'bookmarks' | 'collections' | 'mine' | 'cooked';
const SEGMENTS = [
  { value: 'bookmarks', label: 'Saved' },
  { value: 'collections', label: 'Collections' },
  { value: 'mine', label: 'Mine' },
  { value: 'cooked', label: 'Cooked' },
] as const;

const EMPTY: Record<Segment, { title: string; body: string }> = {
  bookmarks: { title: 'Nothing saved yet', body: 'Save a recipe and it waits for you here.' },
  collections: { title: 'No collections yet', body: 'Group recipes your way: weeknights, for guests, the kids will eat it.' },
  mine: { title: 'No recipes of your own yet', body: 'Write down a family recipe, or bring one in from a website.' },
  cooked: { title: 'Nothing cooked yet', body: 'Each time you finish a recipe in Cook Mode, it goes here.' },
};

export function SavedScreen() {
  const [segment, setSegment] = useState<Segment>('bookmarks');
  return (
    <Screen>
      <Masthead title="Saved" />
      <Segmented label="Show" options={SEGMENTS} value={segment} onChange={setSegment} />
      <EmptyState title={EMPTY[segment].title} body={EMPTY[segment].body} />
    </Screen>
  );
}
