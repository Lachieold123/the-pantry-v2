// The List tab: the shopping list on its own, apart from the plan (Lachlan,
// 1 October: "shopping list and plan should be two separate things"). It is
// still worked out from the plan every time (D-009), so it can't drift from
// it. This week by default; on Sundays it opens on next week when that's
// planned, because that's the one you're shopping for. The Plan tab's card
// can ask for a week with ?week=next.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { entriesInWeek, fromISODate, toISODate, visibleWeeks } from '@/domain/plan/week';
import { AISLE_LABELS } from '@/domain/recipes/labels';
import { formatListForSharing } from '@/domain/shopping/derive';
import { weekRange } from '@/lib/dates';
import { shareText } from '@/lib/share';
import { useHousehold } from '@/store/household';
import { usePlan } from '@/store/plan';
import { useWeekList } from '@/store/shoppingList';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { Screen } from '@/ui/primitives/Screen';
import { CHROME, PLAN, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { ShoppingListView } from './ShoppingListView';
import { Pill } from './ShoppingRows';

type Which = 'this' | 'next';

export function ShoppingScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ week?: string }>();
  const entries = usePlan((s) => s.entries);
  const weeks = visibleWeeks(toISODate(new Date()));
  const [chosen, setChosen] = useState<Which | undefined>();
  const asked: Which | undefined = params.week === 'next' ? 'next' : params.week === 'this' ? 'this' : undefined;
  const sundayDefault: Which = new Date().getDay() === 0 && entriesInWeek(entries, weeks.nextWeek).length > 0 ? 'next' : 'this';
  // A tap on a pill wins over the link, until the link asks again.
  const which = chosen ?? asked ?? sundayDefault;
  const week = which === 'this' ? weeks.thisWeek : weeks.nextWeek;
  const label = which === 'this' ? 'This week' : 'Next week';
  const { list } = useWeekList(week);
  const choose = (w: Which) => {
    setChosen(w);
    if (asked) router.setParams({ week: undefined });
  };

  const share = async () => {
    if (!list.sections.length && !list.extras.length) {
      toast({ message: 'Your list is empty. Plan a meal first.' });
      return;
    }
    const result = await shareText(formatListForSharing(list, (a) => AISLE_LABELS[a], `Shopping list, ${label.toLowerCase()}`));
    if (result === 'copied') toast({ message: 'Copied. Paste it into a message.' });
    if (result === 'failed') toast({ message: "Couldn't open sharing. Try again." });
  };

  return (
    <Screen tab testID="shopping-screen">
      <View>
        <TitleBlock
          kicker="List"
          title="Shopping list"
          action={
            <IconButton
              icon="share"
              shape="chip"
              size={18}
              label="Send the shopping list"
              onPress={() => void share()}
              testID="shopping-share"
            />
          }
        />
        <View
          style={{ flexDirection: 'row', gap: SPACE.xs, marginTop: CHROME.titleBottom, marginBottom: PLAN.aisleGap }}
          accessibilityRole="radiogroup"
          accessibilityLabel="Which week"
        >
          {(['this', 'next'] as const).map((w) => (
            <Pill
              key={w}
              label={`${w === 'this' ? 'This week' : 'Next week'} · ${weekRange(fromISODate(w === 'this' ? weeks.thisWeek : weeks.nextWeek))}`}
              on={which === w}
              onPress={() => choose(w)}
              testID={`segment-${w}`}
            />
          ))}
        </View>
        <SharedLine />
        <ShoppingListView week={week} weekLabel={label} onPlan={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

/** In a household (D-039), the list says who it's shared with and whether it's up to date. */
function SharedLine() {
  const router = useRouter();
  const household = useHousehold((s) => s.household);
  const me = useHousehold((s) => s.userId);
  const status = useHousehold((s) => s.status);
  if (!household) return null;
  const others = household.members.filter((m) => m.userId !== me).map((m) => m.name);
  if (!others.length) return null;
  return (
    <Pressable
      onPress={() => router.push('/household')}
      accessibilityRole="button"
      testID="shopping-shared"
      style={{ minHeight: TAP_TARGET, justifyContent: 'center' }}
    >
      <Text variant="meta" colour="inkMuted">
        {`Shared with ${others.join(', ')}${status === 'offline' ? ' · offline, will catch up' : ''}`}
      </Text>
    </Pressable>
  );
}
