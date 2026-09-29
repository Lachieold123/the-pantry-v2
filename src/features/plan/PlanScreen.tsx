// Plan: this week and next, by real date (D-009). Past days stay visible but
// quiet; every future day has a one-tap way to add a meal.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { entriesFor, entriesInWeek, fromISODate, isPast, toISODate, visibleWeeks, weekDays } from '@/domain/plan/week';
import { longDate } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { PlanEntryRow } from './PlanEntryRow';

type Week = 'this' | 'next';
const WEEKS = [
  { value: 'this', label: 'This week' },
  { value: 'next', label: 'Next week' },
] as const;

export function PlanScreen() {
  const router = useRouter();
  const entries = usePlan((s) => s.entries);
  const [week, setWeek] = useState<Week>('this');
  const today = toISODate(new Date());
  const weeks = visibleWeeks(today);
  const start = week === 'this' ? weeks.thisWeek : weeks.nextWeek;
  const inWeek = entriesInWeek(entries, start);
  const dinners = inWeek.filter((e) => e.slot === 'dinner').length;

  return (
    <Screen>
      <Masthead title="Plan" kicker={inWeek.length ? `${dinners} ${dinners === 1 ? 'dinner' : 'dinners'} planned` : undefined} />
      <Segmented<Week> label="Week" options={WEEKS} value={week} onChange={setWeek} />
      {inWeek.length === 0 ? (
        <EmptyState
          title={week === 'this' ? 'Nothing planned yet' : 'Next week is clear'}
          body="Pick a few dinners and your shopping list writes itself, sorted by aisle."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
        />
      ) : null}
      {weekDays(start).map((day) => {
        const past = isPast(day, today);
        const dayEntries = entriesFor(inWeek, day);
        if (past && dayEntries.length === 0) return null;
        return (
          <View key={day} style={{ gap: SPACE.sm }}>
            <SectionHeader
              title={day === today ? `Today · ${longDate(fromISODate(day))}` : longDate(fromISODate(day))}
              action={
                past ? undefined : (
                  <Button label="Add" icon="add" kind="quiet" onPress={() => router.push({ pathname: '/plan/add', params: { day } })} />
                )
              }
            />
            {dayEntries.length === 0 ? (
              <Text variant="meta">Nothing planned</Text>
            ) : (
              dayEntries.map((e) => <PlanEntryRow key={e.id} entry={e} past={past} />)
            )}
            <Divider />
          </View>
        );
      })}
    </Screen>
  );
}
