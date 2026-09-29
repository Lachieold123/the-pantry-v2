// Shop: the list and the cupboard, side by side as two segments (map §6).
// On Sundays it opens on next week's list, because that's the one you're shopping for.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { entriesInWeek, toISODate, visibleWeeks } from '@/domain/plan/week';
import { usePlan } from '@/store/plan';
import { Masthead } from '@/ui/patterns/Masthead';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { CupboardView } from './CupboardView';
import { ShoppingListView } from './ShoppingListView';

type Segment = 'list' | 'cupboard';
type Week = 'this' | 'next';
const SEGMENTS = [
  { value: 'list', label: 'List' },
  { value: 'cupboard', label: 'Cupboard' },
] as const;
const WEEKS = [
  { value: 'this', label: 'This week' },
  { value: 'next', label: 'Next week' },
] as const;

export function ShopScreen() {
  const router = useRouter();
  const entries = usePlan((s) => s.entries);
  const now = new Date();
  const weeks = visibleWeeks(toISODate(now));
  const [segment, setSegment] = useState<Segment>('list');
  const [week, setWeek] = useState<Week>(() => (now.getDay() === 0 && entriesInWeek(entries, weeks.nextWeek).length > 0 ? 'next' : 'this'));

  return (
    <Screen>
      <Masthead title="Shop" />
      <Segmented<Segment> label="Show" options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'list' ? (
        <>
          <Segmented<Week> label="Week" options={WEEKS} value={week} onChange={setWeek} />
          <ShoppingListView
            week={week === 'this' ? weeks.thisWeek : weeks.nextWeek}
            weekLabel={week === 'this' ? 'This week' : 'Next week'}
            onBrowse={() => router.navigate('/recipes')}
          />
        </>
      ) : (
        <CupboardView />
      )}
    </Screen>
  );
}
