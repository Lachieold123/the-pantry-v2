// The two page heads of v1's library (spec §4.4).
// LibraryHead: Saved, Collections and one collection. A 38pt round back chip,
//   then a 22×1 rule and small kicker, a big display title, and an italic
//   amber count ("4 items").
// LibraryPushedHead: Recent and Kitchen stats. The square back
//   button, an amber kicker, a serif title that may wrap ("Recently\nviewed"),
//   an optional count line and an optional action on the right ("Clear").
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { goBack } from '@/lib/navigation';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { LIBRARY, libraryColours } from '@/ui/tokens/library';
import { SPACE } from '@/ui/tokens/type';

/** "1 recipe", "3 recipes". */
export type CountUnit = readonly [singular: string, plural: string];

type HeadProps = {
  kicker: string;
  title: string;
  count: number;
  unit: CountUnit;
  /** A second chip on the right of the back chip (a collection's "⋯"). */
  action?: ReactNode;
};

export function LibraryHead({ kicker, title, count, unit, action }: HeadProps) {
  const styles = useStyles();
  const router = useRouter();
  return (
    <View>
      <View style={styles.bar}>
        <IconButton icon="back" label="Back" shape="chip" onPress={() => goBack(router)} testID="back" />
        {action}
      </View>
      <View style={styles.head}>
        <View style={styles.kickerRow}>
          <View style={styles.rule} />
          <Text variant="kickerLibrary" colour="inkMuted">
            {kicker}
          </Text>
        </View>
        <Text variant="displayLibrary" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <CountLine count={count} unit={unit} />
      </View>
    </View>
  );
}

function CountLine({ count, unit }: { count: number; unit: CountUnit }) {
  const styles = useStyles();
  const { name } = useTheme();
  const word = count === 1 ? unit[0] : unit[1];
  return (
    <View style={styles.countRow} accessible accessibilityLabel={`${count} ${word}`}>
      <Text variant="countLibrary" tone={libraryColours(name).count}>
        {count}
      </Text>
      <Text variant="bodySmall" colour="inkSoft">
        {` ${word}`}
      </Text>
    </View>
  );
}

type PushedProps = {
  kicker: string;
  title: string;
  /** "3 recipes" under the title, when the page counts something. */
  count?: { value: number; unit: CountUnit } | undefined;
  action?: ReactNode;
};

export function LibraryPushedHead({ kicker, title, count, action }: PushedProps) {
  const styles = useStyles();
  const router = useRouter();
  return (
    <View style={styles.pushed}>
      <View style={styles.pushedBack}>
        <IconButton icon="back" label="Back" shape="square" size={24} onPress={() => goBack(router)} testID="back" />
      </View>
      <View style={styles.pushedText}>
        <Text variant="kicker" colour="accentText">
          {kicker}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {count ? (
          <Text variant="meta" colour="inkMuted" style={styles.pushedCount}>
            {`${count.value} ${count.value === 1 ? count.unit[0] : count.unit[1]}`}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.pushedBack}>{action}</View> : null}
    </View>
  );
}

// The page gutter is 20; v1's library bar and head sat at 18 and 22, so they
// shift by the difference rather than restating the gutter.
const useStyles = makeStyles(({ colours }) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: LIBRARY.barX - SPACE.gutter,
    paddingVertical: LIBRARY.barY,
  },
  head: {
    marginHorizontal: LIBRARY.headX - SPACE.gutter,
    paddingTop: LIBRARY.headTop,
    paddingBottom: LIBRARY.headBottom,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: LIBRARY.ruleGap },
  rule: { width: LIBRARY.ruleWidth, height: LIBRARY.ruleHeight, backgroundColor: colours.inkSubtle },
  title: { marginTop: LIBRARY.titleTop },
  countRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: LIBRARY.countTop },
  pushed: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingBottom: SPACE.xxs },
  pushedBack: { marginTop: SPACE.xxs },
  pushedText: { flex: 1, gap: SPACE.xxs },
  pushedCount: { marginTop: SPACE.xxs },
}));
