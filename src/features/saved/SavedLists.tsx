// The contents of the library pages the drawer opens.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { recentlyCooked, weeklyStreak } from '@/domain/cook/cook';
import { fromISODate } from '@/domain/plan/week';
import type { Recipe } from '@/domain/recipes/types';
import { goToTab } from '@/lib/navigation';
import { useToday } from '@/lib/useToday';
import { useCookLog } from '@/store/cookLog';
import { useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { ListRow } from '@/ui/primitives/ListRow';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';

/** The recipes behind a list of ids, skipping any that no longer exist. */
function useRecipesFor() {
  const getRecipe = useRecipeLookup();
  return (ids: readonly string[]) => ids.map(getRecipe).filter((r): r is Recipe => r !== undefined);
}

// Counts only what the collection page will list (see useDrawerCounts).
const countLabel = (n: number) => (n === 1 ? '1 recipe' : `${n} recipes`);

function useOpen() {
  const router = useRouter();
  return (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
}

export function RecipeRows({ recipes, note }: { recipes: Recipe[]; note?: (r: Recipe) => string }) {
  const open = useOpen();
  return (
    <View style={{ gap: SPACE.md }}>
      {recipes.map((r) => (
        <RecipeCard
          key={r.id}
          recipe={r}
          image={RECIPE_IMAGES[r.id]}
          size="row"
          onPress={() => open(r.id)}
          {...(note ? { note: note(r) } : {})}
        />
      ))}
    </View>
  );
}

export function BookmarksList() {
  const router = useRouter();
  const bookmarks = useSaved((s) => s.bookmarks);
  const recipesFor = useRecipesFor();
  const saved = recipesFor(bookmarks.map((b) => b.recipeId));
  return saved.length ? (
    <RecipeRows recipes={saved} />
  ) : (
    <EmptyState
      title="Nothing saved yet"
      body="Tap Save on any recipe and it waits for you here."
      action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
      testID="cookmarks-empty"
    />
  );
}

export function RecentList() {
  const router = useRouter();
  const recent = useSaved((s) => s.recentlyViewed);
  const recipes = useRecipesFor()(recent);
  return recipes.length ? (
    <RecipeRows recipes={recipes} />
  ) : (
    <EmptyState
      title="Nothing viewed yet"
      body="Recipes you open show up here, so the one you were looking at is easy to find again."
      action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
      testID="recent-empty"
    />
  );
}

export function CollectionsList() {
  const router = useRouter();
  const getRecipe = useRecipeLookup();
  const collections = useSaved((s) => s.collections);
  const createCollection = useSaved((s) => s.createCollection);
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const duplicate = collections.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  const create = () => {
    if (!trimmed || duplicate) return;
    createCollection(trimmed);
    setName('');
  };
  return (
    <View style={{ gap: SPACE.lg }}>
      {collections.length ? (
        <View>
          {collections.map((c) => (
            <View key={c.id}>
              <ListRow
                title={c.name}
                detail={countLabel(c.recipeIds.filter((r) => getRecipe(r) !== undefined).length)}
                onPress={() => router.push({ pathname: '/collections/[id]', params: { id: c.id } })}
                testID={`collection-row-${c.id}`}
              />
              <Divider />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No collections yet"
          body="Group recipes your way: weeknights, for guests, the ones the kids will eat."
          testID="collections-empty"
        />
      )}
      <View style={{ gap: SPACE.sm }}>
        <TextField
          label="New collection"
          placeholder="Weeknights"
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          returnKeyType="done"
          maxLength={40}
          testID="collections-new-name"
          {...(duplicate && trimmed ? { error: 'You already have a collection with that name.' } : {})}
        />
        <Button label="Create collection" onPress={create} disabled={!trimmed || duplicate} testID="collections-create" />
      </View>
    </View>
  );
}

export function CookedList() {
  const recipesFor = useRecipesFor();
  const router = useRouter();
  const log = useCookLog((s) => s.log);
  const today = useToday();
  const recipes = recipesFor(recentlyCooked(log));
  const times = (id: string) => log.filter((e) => e.recipeId === id).length;
  if (!recipes.length) {
    return (
      <EmptyState
        title="Nothing cooked yet"
        body="Tap Done when you finish a recipe in Cook Mode, and it goes here."
        action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
        testID="stats-empty"
      />
    );
  }
  const streak = weeklyStreak(log, fromISODate(today));
  return (
    <View style={{ gap: SPACE.md }}>
      {streak >= 2 ? <SectionHeader title={`Cooking ${streak} weeks in a row`} /> : null}
      <RecipeRows recipes={recipes} note={(r) => (times(r.id) === 1 ? 'Cooked once' : `Cooked ${times(r.id)} times`)} />
    </View>
  );
}
