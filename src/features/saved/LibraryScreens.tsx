// The library pages the side menu opens (spec §4.3): Cookmarks, Collections,
// My recipes, Recently viewed and Kitchen stats. Each gets its route and a
// pushed-screen header here, so the pages share one frame and back behaviour.
import type { ReactNode } from 'react';

import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { Screen } from '@/ui/primitives/Screen';
import { MineList } from './MineList';
import { BookmarksList, CollectionsList, CookedList, RecentList } from './SavedLists';

function LibraryPage({ kicker, title, testID, children }: { kicker: string; title: string; testID: string; children: ReactNode }) {
  return (
    <Screen testID={testID}>
      <PushedHeader kicker={kicker} title={title} />
      {children}
    </Screen>
  );
}

export function CookmarksScreen() {
  return (
    <LibraryPage kicker="Saved" title="Cookmarks" testID="cookmarks-screen">
      <BookmarksList />
    </LibraryPage>
  );
}

export function CollectionsScreen() {
  return (
    <LibraryPage kicker="Saved" title="Collections" testID="collections-screen">
      <CollectionsList />
    </LibraryPage>
  );
}

export function MyRecipesScreen() {
  return (
    <LibraryPage kicker="My kitchen" title="My recipes" testID="my-recipes-screen">
      <MineList />
    </LibraryPage>
  );
}

export function RecentScreen() {
  return (
    <LibraryPage kicker="History" title="Recently viewed" testID="recent-screen">
      <RecentList />
    </LibraryPage>
  );
}

export function StatsScreen() {
  return (
    <LibraryPage kicker="My kitchen" title="Kitchen stats" testID="stats-screen">
      <CookedList />
    </LibraryPage>
  );
}
