// The Plan tab: "This week" (the plan, by real date, D-009) and "Shopping
// list" (derived from it, never stored). On Sundays the list opens on next
// week, because that's the one you're shopping for. P4 rebuilds the week view
// to v1's day strip and slots; P2 gives both views their v1 home.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { entriesFor, entriesInWeek, fromISODate, isPast, toISODate, visibleWeeks, weekDays } from '@/domain/plan/week';
import { longDate, weekRange } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Text } from '@/ui/primitives/Text';
import { UnderlineTabs } from '@/ui/primitives/UnderlineTabs';
import { SPACE } from '@/ui/tokens/type';
import { PlanEntryRow } from './PlanEntryRow';
import { ShoppingListView } from './ShoppingListView';

type PlanView = 'week' | 'list';
type Week = 'this' | 'next';
const VIEWS = [
  { value: 'week', label: 'This week' },
  { value: 'list', label: 'Shopping list' },
] as const;

export function PlanScreen() {
  const router = useRouter();
  const entries = usePlan((s) => s.entries);
  const today = toISODate(new Date());
  const weeks = visibleWeeks(today);
  const [view, setView] = useState<PlanView>('week');
  const [week, setWeek] = useState<Week>(() =>
    new Date().getDay() === 0 && entriesInWeek(entries, weeks.nextWeek).length > 0 ? 'next' : 'this',
  );
  const start = week === 'this' ? weeks.thisWeek : weeks.nextWeek;
  const inWeek = entriesInWeek(entries, start);
  const dinners = inWeek.filter((e) => e.slot === 'dinner').length;

  const weekLabel = week === 'this' ? 'This week' : 'Next week';

  return (
    <Screen tab testID="plan-screen">
      <TitleBlock
        kicker="Plan"
        title="Your week"
        subtitle={inWeek.length ? `${dinners} ${dinners === 1 ? 'dinner' : 'dinners'} planned` : undefined}
      />
      <UnderlineTabs<PlanView> label="Plan view" options={VIEWS} value={view} onChange={setView} />
      <Segmented<Week>
        label="Week"
        options={[
          { value: 'this', label: weekRange(fromISODate(weeks.thisWeek)) },
          { value: 'next', label: weekRange(fromISODate(weeks.nextWeek)) },
        ]}
        value={week}
        onChange={setWeek}
      />
      {view === 'list' ? <ShoppingListView week={start} weekLabel={weekLabel} onBrowse={() => router.navigate('/browse')} /> : null}
      {view === 'week' && inWeek.length === 0 ? (
        <EmptyState
          title={week === 'this' ? 'Nothing planned yet' : 'Next week is clear'}
          body="Pick a few dinners and your shopping list writes itself, sorted by aisle."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
          testID="plan-empty"
        />
      ) : null}
      {view === 'week'
        ? weekDays(start).map((day) => {
            const past = isPast(day, today);
            const dayEntries = entriesFor(inWeek, day);
            if (past && dayEntries.length === 0) return null;
            return (
              <View key={day} style={{ gap: SPACE.sm }}>
                <SectionHeader
                  title={day === today ? `Today · ${longDate(fromISODate(day))}` : longDate(fromISODate(day))}
                  action={
                    past ? undefined : (
                      <Button
                        label="Add"
                        icon="add"
                        kind="quiet"
                        onPress={() => router.push({ pathname: '/plan/add', params: { day } })}
                        testID={`plan-add-${day}`}
                      />
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
          })
        : null}
    </Screen>
  );
}
