// The four Saved segments' contents.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { getCatalogueRecipe } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { recentlyCooked, weeklyStreak } from '@/domain/cook/cook';
import type { Recipe } from '@/domain/recipes/types';
import { useCookLog } from '@/store/cookLog';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { ListRow } from '@/ui/primitives/ListRow';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';

const recipesFor = (ids: readonly string[]) => ids.map(getCatalogueRecipe).filter((r): r is Recipe => r !== undefined);

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
  const recent = useSaved((s) => s.recentlyViewed);
  const saved = recipesFor(bookmarks.map((b) => b.recipeId));
  return (
    <View style={{ gap: SPACE.lg }}>
      {saved.length ? (
        <RecipeRows recipes={saved} />
      ) : (
        <EmptyState
          title="Nothing saved yet"
          body="Tap Save on any recipe and it waits for you here."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
        />
      )}
      {recent.length ? (
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Recently viewed" />
          <RecipeRows recipes={recipesFor(recent.slice(0, 5))} />
        </View>
      ) : null}
    </View>
  );
}

export function CollectionsList() {
  const router = useRouter();
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
                detail={c.recipeIds.length === 1 ? '1 recipe' : `${c.recipeIds.length} recipes`}
                onPress={() => router.push({ pathname: '/saved/collection/[id]', params: { id: c.id } })}
              />
              <Divider />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="No collections yet" body="Group recipes your way: weeknights, for guests, the ones the kids will eat." />
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
          {...(duplicate && trimmed ? { error: 'You already have a collection with that name.' } : {})}
        />
        <Button label="Create collection" onPress={create} disabled={!trimmed || duplicate} />
      </View>
    </View>
  );
}

export function CookedList() {
  const router = useRouter();
  const log = useCookLog((s) => s.log);
  const recipes = recipesFor(recentlyCooked(log));
  const times = (id: string) => log.filter((e) => e.recipeId === id).length;
  if (!recipes.length) {
    return (
      <EmptyState
        title="Nothing cooked yet"
        body="Tap Done when you finish a recipe in Cook Mode, and it goes here."
        action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
      />
    );
  }
  const streak = weeklyStreak(log, new Date());
  return (
    <View style={{ gap: SPACE.md }}>
      {streak >= 2 ? <SectionHeader title={`Cooking ${streak} weeks in a row`} /> : null}
      <RecipeRows recipes={recipes} note={(r) => (times(r.id) === 1 ? 'Cooked once' : `Cooked ${times(r.id)} times`)} />
    </View>
  );
}
