// Kitchen stats' pieces (spec §4.14, StatsModal): the ink streak card with its
// big serif number, the three bordered tiles, and a numbered ranking list.
// The streak card uses the ink fill, so it's black in light mode and cream in dark.
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { LIBRARY } from '@/ui/tokens/library';
import { RADIUS, SPACE } from '@/ui/tokens/type';

export function StatStreakCard({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.streak} accessible accessibilityLabel={`${value} ${label}`} testID="stats-streak">
      <Text variant="numberHuge" colour="bg" align="center">
        {value}
      </Text>
      <Text variant="label" colour="bg" align="center" style={styles.streakLabel}>
        {label}
      </Text>
    </View>
  );
}

export type StatTileItem = { value: number; label: string; testID: string };

export function StatTiles({ tiles }: { tiles: readonly StatTileItem[] }) {
  const styles = useStyles();
  return (
    <View style={styles.tiles}>
      {tiles.map((t) => (
        <View key={t.testID} style={styles.tile} accessible accessibilityLabel={`${t.label}: ${t.value}`} testID={t.testID}>
          <Text variant="numberTile" align="center">
            {t.value}
          </Text>
          <Text variant="statLabel" colour="inkMuted" align="center">
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type StatRankItem = { key: string; label: string; count: number };

export function StatRankList({ title, items, testID }: { title: string; items: readonly StatRankItem[]; testID: string }) {
  const styles = useStyles();
  return (
    <View testID={testID}>
      <Text variant="headingSansSmall" accessibilityRole="header" style={styles.section}>
        {title}
      </Text>
      {items.map((r, i) => (
        <View
          key={r.key}
          style={styles.rank}
          accessible
          accessibilityLabel={`${i + 1}. ${r.label}, ${r.count === 1 ? 'once' : `${r.count} times`}`}
        >
          <Text variant="numberDay" colour="inkMuted" style={styles.rankNumber}>
            {i + 1}
          </Text>
          <Text variant="row" numberOfLines={1} style={styles.rankLabel}>
            {r.label}
          </Text>
          <Text variant="label" colour="inkMuted">
            {`${r.count}×`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  streak: {
    backgroundColor: colours.ink,
    borderRadius: RADIUS.big,
    paddingVertical: LIBRARY.streakY,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
  },
  // v1 set the label at 85% so the number leads.
  streakLabel: { opacity: 0.85 },
  tiles: { flexDirection: 'row', gap: LIBRARY.tileGap },
  tile: {
    flex: 1,
    backgroundColor: colours.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colours.border,
    paddingVertical: LIBRARY.tileY,
    paddingHorizontal: SPACE.xxs,
    gap: SPACE.xxs,
    alignItems: 'center',
  },
  section: { marginBottom: SPACE.sm },
  rank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LIBRARY.rankGap,
    paddingVertical: LIBRARY.rankY,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  rankNumber: { width: LIBRARY.rankNumber },
  rankLabel: { flex: 1 },
}));
