// The day strip (spec §4.11): this week and next, one cell per day, with a
// dot for each of breakfast, lunch and dinner that's planned. Opens on today.
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { entriesFor, fromISODate, SLOTS, type ISODate, type PlanEntry } from '@/domain/plan/week';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PLAN, RADIUS, SPACE } from '@/ui/tokens/type';

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** Day cells that fit on a phone before the strip scrolls. */
const VISIBLE = 5;

type Props = { days: ISODate[]; selected: ISODate; today: ISODate; entries: readonly PlanEntry[]; onSelect: (day: ISODate) => void };

export function WeekStrip({ days, selected, today, entries, onSelect }: Props) {
  const styles = useStyles();
  const scroll = useRef<ScrollView>(null);
  const index = Math.max(0, days.indexOf(today));
  useEffect(() => {
    // Open on Monday, as v1 did, unless today is too far along to be seen.
    const late = Math.max(0, index - VISIBLE + 1);
    scroll.current?.scrollTo({ x: late * (PLAN.dayWidth + SPACE.xs), animated: false });
  }, [index]);
  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Days"
    >
      {days.map((day) => {
        const d = fromISODate(day);
        const on = day === selected;
        const planned = new Set(entriesFor(entries, day).map((e) => e.slot));
        const label = `${day === today ? 'Today, ' : ''}${WEEKDAY[d.getDay()]} ${d.getDate()}, ${planned.size} of 3 meals planned`;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            testID={`plan-day-${day}`}
            style={[styles.cell, on && styles.cellOn, day < today && !on && styles.past]}
          >
            <Text variant="infoLabel" colour={on ? 'bgSoft' : 'inkSoft'}>
              {WEEKDAY[d.getDay()]}
            </Text>
            <Text variant="numberDay" colour={on ? 'bg' : 'ink'}>
              {d.getDate()}
            </Text>
            <View style={styles.dots}>
              {SLOTS.map((slot) => (
                <View
                  key={slot}
                  style={[styles.dot, planned.has(slot) ? (on ? styles.dotOnSelected : styles.dotOn) : on ? styles.dotOffSelected : null]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  strip: { marginHorizontal: -SPACE.gutter },
  row: { gap: SPACE.xs, paddingHorizontal: SPACE.gutter },
  cell: {
    width: PLAN.dayWidth,
    height: PLAN.dayHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellOn: { backgroundColor: colours.ink, borderColor: colours.ink },
  past: { opacity: 0.55 },
  dots: { flexDirection: 'row', gap: 3, marginTop: SPACE.xxs },
  dot: { width: PLAN.dot, height: PLAN.dot, borderRadius: PLAN.dot, backgroundColor: colours.border },
  dotOn: { backgroundColor: colours.ink },
  dotOnSelected: { backgroundColor: colours.bg },
  dotOffSelected: { backgroundColor: colours.inkMuted },
}));
