// The Plan tab (spec §4.11–4.12), in v1's CartModal look: the title with a
// round share button and "N of 21 meals", then the week: a day strip, the
// day's three meals, ideas for an empty slot, and a card that opens that
// week's shopping list on the List tab. The list lives on its own tab now
// (Lachlan, 1 October), so this page is only about what you'll eat.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { firstOpenSlot, weekAsText, weekProgress } from '@/domain/plan/summary';
import { entriesFor, fromISODate, isPast, toISODate, visibleWeeks, weekDays, weekStart, type ISODate } from '@/domain/plan/week';
import { longDate, shortDate, weekdayName } from '@/lib/dates';
import { shareText } from '@/lib/share';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useWeekList } from '@/store/shoppingList';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { CHROME, PLAN, SPACE } from '@/ui/tokens/type';
import { DaySlots } from './DaySlots';
import { DaySuggestions, ListSummaryCard, WeekProgress } from './PlanParts';
import { WeekStrip } from './WeekStrip';

export function PlanScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = usePlan((s) => s.entries);
  const getRecipe = useRecipeLookup();
  const today = toISODate(new Date());
  const weeks = visibleWeeks(today);
  const days = [...weekDays(weeks.thisWeek), ...weekDays(weeks.nextWeek)];
  const [selected, setSelected] = useState<ISODate>(today);
  const week = weekStart(selected);
  const progress = weekProgress(entries, week);
  const dayWeek = useWeekList(week);
  const past = isPast(selected, today);

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
    const result = await shareText(text);
    if (result === 'copied') toast({ message: 'Copied. Paste it into a message.' });
    if (result === 'failed') toast({ message: "Couldn't open sharing. Try again." });
  };

  return (
    <Screen tab testID="plan-screen">
      <View>
        <TitleBlock
          kicker="Plan"
          title="Your week"
          action={
            <IconButton icon="share" shape="chip" size={18} label="Send the week’s plan" onPress={() => void share()} testID="plan-share" />
          }
        >
          <View style={{ marginTop: PLAN.afterProgress - SPACE.xxs }}>
            <WeekProgress planned={progress.planned} total={progress.total} />
          </View>
        </TitleBlock>
        <View style={{ marginTop: CHROME.titleBottom, marginBottom: PLAN.afterStrip }}>
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
          onOpen={() => router.navigate({ pathname: '/list', params: { week: week === weeks.nextWeek ? 'next' : 'this' } })}
        />
      </View>
    </Screen>
  );
}
