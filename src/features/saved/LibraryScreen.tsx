// The library: Cookmarks, Collections, My recipes and Recent on one
// page with four tabs, rather than four pages (Lachlan, 6 October 2026). One
// head, whose count follows the open tab, then the tabs, then that tab's body.
//
// Switching tabs is local state, not navigation: it doesn't add to the back
// stack, and the tab stays put while you open a recipe and come back. A link
// (/library?tab=recent, or the old /recent) picks the tab it opens on.
import { useState, type ComponentType } from 'react';
import { View } from 'react-native';

import { useMyRecipeList } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { LibraryHead, type CountUnit } from '@/ui/patterns/LibraryHeader';
import { Screen } from '@/ui/primitives/Screen';
import { CollectionsTab } from './CollectionsTab';
import { CookmarksTab, useCookmarkCount } from './CookmarksTab';
import { LibraryTabs, tabFromLink, type LibraryTab } from './LibraryTabs';
import { MyRecipesTab } from './MyRecipesTab';
import { RecentTab, useRecentCount } from './RecentTab';
import { RECIPES_UNIT } from './libraryHooks';

// Under a head titled "Library", a bare "4 items" wouldn't say what was counted.
const UNIT: Record<LibraryTab, CountUnit> = {
  cookmarks: ['saved recipe', 'saved recipes'],
  collections: ['collection', 'collections'],
  mine: RECIPES_UNIT,
  recent: RECIPES_UNIT,
};

const BODY: Record<LibraryTab, ComponentType> = {
  cookmarks: CookmarksTab,
  collections: CollectionsTab,
  mine: MyRecipesTab,
  recent: RecentTab,
};

type Props = {
  /** The tab to open on: a route's fixed tab, or a link's `tab` param as given. */
  initialTab?: LibraryTab | string | string[] | undefined;
};

export function LibraryScreen({ initialTab }: Props) {
  const linked = tabFromLink(initialTab);
  const [tab, setTab] = useState<LibraryTab>(linked);
  // A link to a different tab while the library is already open (say, back
  // from saving a recipe draft) moves to that tab rather than being ignored.
  // Adjusted while rendering, React's pattern for state that follows a prop.
  const [lastLinked, setLastLinked] = useState(linked);
  if (linked !== lastLinked) {
    setLastLinked(linked);
    setTab(linked);
  }

  const counts: Record<LibraryTab, number> = {
    cookmarks: useCookmarkCount(),
    collections: useSaved((s) => s.collections.length),
    mine: useMyRecipeList().length,
    recent: useRecentCount(),
  };
  const Body = BODY[tab];

  return (
    <Screen testID="library-screen">
      <View>
        <LibraryHead kicker="You" title="Library" count={counts[tab]} unit={UNIT[tab]} />
        <LibraryTabs value={tab} onChange={setTab} />
      </View>
      <Body />
    </Screen>
  );
}
