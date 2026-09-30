// Kitchen stats: v1's "Your cooking" (StatsModal, `light-21`). Everything is
// worked out from the cook log (domain/cook/stats): the day streak on an ink
// card, three tiles, the top cuisines and most-cooked dishes, and a way to
// clear the history that can be undone.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { kitchenStats } from '@/domain/cook/stats';
import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { CUISINES, type CuisineId } from '@/domain/recipes/types';
import { useCookLog } from '@/store/cookLog';
import { useRecipeLookup } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { LibraryPushedHead } from '@/ui/patterns/LibraryHeader';
import { StatRankList, StatStreakCard, StatTiles } from '@/ui/patterns/StatCards';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { LIBRARY } from '@/ui/tokens/library';
import { SPACE } from '@/ui/tokens/type';

const isCuisine = (key: string): key is CuisineId => (CUISINES as readonly string[]).includes(key);

export function StatsScreen() {
  const router = useRouter();
  const toast = useToast();
  const log = useCookLog((s) => s.log);
  const clearLog = useCookLog((s) => s.clearLog);
  const restoreLog = useCookLog((s) => s.restoreLog);
  const getRecipe = useRecipeLookup();
  // Cooks of a recipe that no longer exists (one of your own, deleted) are counted but not ranked.
  const stats = kitchenStats(log, new Date(), (id) => getRecipe(id)?.cuisine);

  const clear = () => {
    const cleared = clearLog();
    toast({ message: 'Cooking history cleared', undo: () => restoreLog(cleared) });
  };

  const header = <LibraryPushedHead kicker="Kitchen stats" title={'Your\ncooking'} />;
  if (stats.total === 0) {
    return (
      <Screen testID="stats-screen">
        {header}
        <EmptyState
          title="No cooks logged yet"
          body="Tap Cook on any recipe, or Done at the end of Cook Mode, and your streak, weekly count and top cuisines build up here."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
          testID="stats-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="stats-screen">
      <View style={{ gap: SPACE.md }}>
        {header}
        <StatStreakCard value={stats.streak} label={stats.streak === 1 ? 'day cooking streak' : 'days cooking streak'} />
        <StatTiles
          tiles={[
            { value: stats.thisWeek, label: 'This week', testID: 'stats-week' },
            { value: stats.total, label: 'Total cooks', testID: 'stats-total' },
            { value: stats.best, label: 'Best streak', testID: 'stats-best' },
          ]}
        />
      </View>
      <View style={{ gap: LIBRARY.statsSectionGap }}>
        {stats.topCuisines.length ? (
          <StatRankList
            title="Top cuisines"
            testID="stats-cuisines"
            items={stats.topCuisines.map((r) => ({ ...r, label: isCuisine(r.key) ? CUISINE_LABELS[r.key] : r.key }))}
          />
        ) : null}
        {stats.mostCooked.length ? (
          <StatRankList
            title="Most cooked"
            testID="stats-most-cooked"
            items={stats.mostCooked.map((r) => ({ ...r, label: getRecipe(r.key)?.title ?? '' }))}
          />
        ) : null}
        <Button label="Clear cooking history" kind="destructive" size="lg" block onPress={clear} testID="stats-clear" />
      </View>
    </Screen>
  );
}
