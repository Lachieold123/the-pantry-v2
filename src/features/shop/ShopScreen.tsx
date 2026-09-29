// Shop: the list and the cupboard, side by side as two segments (map §6).
import { useState } from 'react';

import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';

type Segment = 'list' | 'cupboard';
const SEGMENTS = [
  { value: 'list', label: 'List' },
  { value: 'cupboard', label: 'Cupboard' },
] as const;

export function ShopScreen() {
  const [segment, setSegment] = useState<Segment>('list');
  return (
    <Screen>
      <Masthead title="Shop" />
      <Segmented label="Show" options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'list' ? (
        <EmptyState
          title="Your list is empty"
          body="Plan a few meals and everything you need appears here, sorted by aisle and ready to send."
        />
      ) : (
        <EmptyState title="Your cupboard is empty" body="Tell The Pantry what you already have, and it won't send you out for it." />
      )}
    </Screen>
  );
}
