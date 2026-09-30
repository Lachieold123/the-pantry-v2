// The Plan tab (spec §4.11–4.13), laid out as v1's CartModal: the title with
// a round share button and "N of 21 meals", the two tabs, then either the
// week (day strip, the day's three meals, ideas, the shopping-list card) or
// the shopping list. The share button sends whichever you're looking at.
// The list is derived from the plan, never stored (D-009, map rule 3); on
// Sundays it opens on next week, because that's the one you're shopping for.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';

import { firstOpenSlot, weekAsText, weekProgress } from '@/domain/plan/summary';
import { entriesFor, entriesInWeek, fromISODate, isPast, visibleWeeks, weekDays, weekStart, type ISODate } from '@/domain/plan/week';
import { AISLE_LABELS } from '@/domain/recipes/labels';
import { formatListForSharing } from '@/domain/shopping/derive';
import { longDate, shortDate, weekdayName, weekRange } from '@/lib/dates';
import { useToday } from '@/lib/useToday';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { UnderlineTabs } from '@/ui/primitives/UnderlineTabs';
import { PLAN, SPACE } from '@/ui/tokens/type';
import { DaySlots } from './DaySlots';
import { DaySuggestions, ListSummaryCard, WeekProgress } from './PlanParts';
import { ShoppingListView } from './ShoppingListView';
import { Pill } from './ShoppingRows';
import { useWeekList } from './useWeekList';
import { WeekStrip } from './WeekStrip';

type PlanView = 'week' | 'list';
type Which = 'this' | 'next';
const VIEWS = [
  { value: 'week', label: 'This week' },
  { value: 'list', label: 'Shopping list' },
] as const;

export function PlanScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = usePlan((s) => s.entries);
  const getRecipe = useRecipeLookup();
  const today = useToday();
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
  // Overnight, a selected "Today" moves on with the date; a day the cook picked stays picked (F16).
  const [selectedToday, setSelectedToday] = useState(today);
  if (selectedToday !== today) {
    setSelectedToday(today);
    if (selected === selectedToday) setSelected(today);
  }
  const [listWhich, setListWhich] = useState<Which>(() =>
    fromISODate(today).getDay() === 0 && entriesInWeek(entries, weeks.nextWeek).length > 0 ? 'next' : 'this',
  );
  const listWeek = listWhich === 'this' ? weeks.thisWeek : weeks.nextWeek;
  const listLabel = listWhich === 'this' ? 'This week' : 'Next week';
  const week = view === 'week' ? weekStart(selected) : listWeek;
  const progress = weekProgress(entries, week);
  const dayWeek = useWeekList(weekStart(selected));
  const listWeekList = useWeekList(listWeek);
  const past = isPast(selected, today);

  const send = async (text: string, empty: string) => {
    if (!text) {
      toast({ message: empty });
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {
      toast({ message: "Couldn't open sharing. Try again." });
    }
  };
  const share = () =>
    view === 'week'
      ? send(
          weekAsText(
            entries,
            week,
            (id) => getRecipe(id)?.title,
            (d) => longDate(fromISODate(d)),
          ),
          'Nothing planned this week yet',
        )
      : send(
          // Dates in the title: the person it's sent to may read it on another day (F132).
          formatListForSharing(
            listWeekList.list,
            (a) => AISLE_LABELS[a],
            `Shopping list, ${listLabel.toLowerCase()} (${weekRange(fromISODate(listWeek))})`,
          ),
          listWeekList.list.sections.length || listWeekList.list.extras.length
            ? 'Everything’s ticked off. Nothing left to send.'
            : 'Your list is empty. Plan a meal first.',
        );

  return (
    <Screen tab testID="plan-screen" scrollRef={scroll}>
      <View>
        <TitleBlock
          kicker="Plan"
          title="Your week"
          action={
            <IconButton
              icon="share"
              shape="chip"
              size={18}
              label={view === 'week' ? 'Send the week’s plan' : 'Send the shopping list'}
              onPress={() => void share()}
              testID={view === 'week' ? 'plan-share' : 'shopping-share'}
            />
          }
        >
          <View style={{ marginTop: PLAN.afterProgress - SPACE.xxs }}>
            <WeekProgress planned={progress.planned} total={progress.total} />
          </View>
        </TitleBlock>
        <View style={{ marginBottom: PLAN.afterTabs }}>
          <UnderlineTabs<PlanView> label="Plan view" options={VIEWS} value={view} onChange={setView} />
        </View>
        {view === 'week' ? (
          <>
            <View style={{ marginBottom: PLAN.afterStrip }}>
              <WeekStrip days={days} selected={selected} today={today} entries={entries} onSelect={setSelected} />
            </View>
            <Text variant="dayName" accessibilityRole="header" testID="plan-day-heading" style={{ marginBottom: PLAN.afterDayName }}>
              {weekdayName(fromISODate(selected))}
              <Text variant="numberDay" colour="inkMuted">{` · ${shortDate(fromISODate(selected))}`}</Text>
            </Text>
            <DaySlots day={selected} entries={entriesFor(entries, selected)} past={past} />
            {past ? null : <DaySuggestions day={selected} slot={firstOpenSlot(entries, selected)} />}
            <ListSummaryCard
              list={dayWeek.list}
              meals={dayWeek.meals}
              onOpen={() => {
                setListWhich(weekStart(selected) === weeks.nextWeek ? 'next' : 'this');
                setView('list');
              }}
            />
          </>
        ) : (
          <View style={{ gap: PLAN.aisleGap }}>
            <View style={{ flexDirection: 'row', gap: SPACE.xs }} accessibilityRole="radiogroup" accessibilityLabel="Which week">
              {(['this', 'next'] as const).map((w) => (
                <Pill
                  key={w}
                  label={`${w === 'this' ? 'This week' : 'Next week'} · ${weekRange(fromISODate(w === 'this' ? weeks.thisWeek : weeks.nextWeek))}`}
                  on={listWhich === w}
                  onPress={() => setListWhich(w)}
                  testID={`segment-${w}`}
                />
              ))}
            </View>
            <ShoppingListView week={listWeek} weekLabel={listLabel} onBrowse={() => router.navigate('/browse')} />
          </View>
        )}
      </View>
    </Screen>
  );
}
