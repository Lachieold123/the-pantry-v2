// The Plan tab (spec §4.11–4.13): "This week" is a day strip over this week
// and next, one day's breakfast, lunch and dinner, ideas for its next open
// meal and a card for the shopping list. "Shopping list" is derived from the
// plan, never stored (D-009, map rule 3). On Sundays the list opens on next
// week, because that's the one you're shopping for.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Share } from 'react-native';

import { firstOpenSlot, weekAsText, weekProgress } from '@/domain/plan/summary';
import {
  entriesFor,
  entriesInWeek,
  fromISODate,
  isPast,
  toISODate,
  visibleWeeks,
  weekDays,
  weekStart,
  type ISODate,
} from '@/domain/plan/week';
import { longDate, shortDate, weekdayName, weekRange } from '@/lib/dates';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Text } from '@/ui/primitives/Text';
import { UnderlineTabs } from '@/ui/primitives/UnderlineTabs';
import { DaySlots } from './DaySlots';
import { DaySuggestions, ListSummaryCard, WeekProgress } from './PlanParts';
import { ShoppingListView } from './ShoppingListView';
import { useWeekList } from './useWeekList';
import { WeekStrip } from './WeekStrip';

type PlanView = 'week' | 'list';
const VIEWS = [
  { value: 'week', label: 'This week' },
  { value: 'list', label: 'Shopping list' },
] as const;

export function PlanScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = usePlan((s) => s.entries);
  const getRecipe = useRecipeLookup();
  const today = toISODate(new Date());
  const weeks = visibleWeeks(today);
  const days = [...weekDays(weeks.thisWeek), ...weekDays(weeks.nextWeek)];
  const scroll = useRef<ScrollView>(null);
  const [view, setViewState] = useState<PlanView>('week');
  // Each view starts at its top, not wherever the other one was scrolled to.
  const setView = (next: PlanView) => {
    setViewState(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const [selected, setSelected] = useState<ISODate>(today);
  const [listWhich, setListWhich] = useState<'this' | 'next'>(() =>
    new Date().getDay() === 0 && entriesInWeek(entries, weeks.nextWeek).length > 0 ? 'next' : 'this',
  );
  const listWeek = listWhich === 'this' ? weeks.thisWeek : weeks.nextWeek;
  const week = weekStart(selected);
  const progress = weekProgress(entries, week);
  const { list, meals } = useWeekList(week);
  const past = isPast(selected, today);
  const open = past ? undefined : firstOpenSlot(entries, selected);

  const share = async () => {
    const text = weekAsText(
      entries,
      week,
      (id) => getRecipe(id)?.title,
      (d) => longDate(fromISODate(d)),
    );
    if (!text) {
      toast({ message: 'Nothing planned this week yet' });
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {
      toast({ message: "Couldn't open sharing. Try again." });
    }
  };

  return (
    <Screen tab testID="plan-screen" scrollRef={scroll}>
      <TitleBlock
        kicker="Plan"
        title="Your week"
        action={<IconButton icon="share" shape="round" label="Send the week's plan" onPress={() => void share()} testID="plan-share" />}
      >
        <WeekProgress planned={progress.planned} total={progress.total} />
      </TitleBlock>
      <UnderlineTabs<PlanView> label="Plan view" options={VIEWS} value={view} onChange={setView} />
      {view === 'week' ? (
        <>
          <WeekStrip days={days} selected={selected} today={today} entries={entries} onSelect={setSelected} />
          <Text variant="dayName" accessibilityRole="header" testID="plan-day-heading">
            {weekdayName(fromISODate(selected))}
            <Text variant="numberDay" colour="inkMuted">{` · ${shortDate(fromISODate(selected))}`}</Text>
          </Text>
          <DaySlots day={selected} entries={entriesFor(entries, selected)} past={past} />
          {open ? <DaySuggestions day={selected} slot={open} /> : null}
          <ListSummaryCard
            list={list}
            meals={meals}
            onOpen={() => {
              setListWhich(week === weeks.nextWeek ? 'next' : 'this');
              setView('list');
            }}
          />
        </>
      ) : (
        <>
          <Segmented<'this' | 'next'>
            label="Week"
            options={[
              { value: 'this', label: weekRange(fromISODate(weeks.thisWeek)) },
              { value: 'next', label: weekRange(fromISODate(weeks.nextWeek)) },
            ]}
            value={listWhich}
            onChange={setListWhich}
          />
          <ShoppingListView
            week={listWeek}
            weekLabel={listWhich === 'this' ? 'This week' : 'Next week'}
            onBrowse={() => router.navigate('/browse')}
          />
        </>
      )}
    </Screen>
  );
}
