// The Cupboard tab: what you have, and what that lets you make tonight.
// P5 rebuilds it to v1's categories and quick adds; P2 gives it its home.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { cupboardIds, whatCanIMake } from '@/domain/cupboard/match';
import { normaliseWords } from '@/domain/ingredients/database';
import { useCupboard } from '@/store/cupboard';
import { useAllRecipes } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { Chip } from '@/ui/primitives/Chip';
import { Divider } from '@/ui/primitives/Divider';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { SearchField } from '@/ui/primitives/SearchField';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const ALL = [...INGREDIENTS.byId.values()].filter((d) => !d.staple).sort((a, b) => a.name.localeCompare(b.name));
const SUGGESTIONS = 8;

export function CupboardScreen() {
  const router = useRouter();
  const toast = useToast();
  // One selector per value, so the screen only re-renders for what it shows (audit PERF-1).
  const items = useCupboard((s) => s.items);
  const add = useCupboard((s) => s.add);
  const remove = useCupboard((s) => s.remove);
  const moveTickedToCupboard = useCupboard((s) => s.moveTickedToCupboard);
  const setMoveTicked = useCupboard((s) => s.setMoveTicked);
  const hidden = useSaved((s) => s.hidden);
  const all = useAllRecipes();
  const [query, setQuery] = useState('');
  const have = useMemo(() => cupboardIds(items), [items]);

  const suggestions = useMemo(() => {
    const words = normaliseWords(query);
    if (!words.length) return [];
    return ALL.filter(
      (d) => !have.has(d.id) && words.every((w) => [d.name, ...d.aliases].some((n) => normaliseWords(n).some((nw) => nw.startsWith(w)))),
    ).slice(0, SUGGESTIONS);
  }, [query, have]);
  const canMake = useMemo(
    () =>
      whatCanIMake(
        all.filter((r) => !hidden.includes(r.id)),
        have,
        INGREDIENTS,
        6,
      ),
    [have, hidden, all],
  );
  const listed = useMemo(
    () =>
      items
        .map((i) => INGREDIENTS.byId.get(i.ingredientId))
        .filter((d) => d !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  return (
    <Screen tab testID="cupboard-screen">
      <TitleBlock
        kicker="Cupboard"
        title="What do you have?"
        subtitle="Tell us what you have. We'll surface recipes that use the most of it."
      />
      <View style={{ gap: SPACE.sm }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Add an ingredient"
          label="Add an ingredient to the cupboard"
          testID="cupboard-search"
        />
        {query.trim() && suggestions.length === 0 ? (
          <Text variant="meta">No ingredient by that name. Try a simpler word, like “rice”.</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          {suggestions.map((d) => (
            <Chip
              key={d.id}
              label={`+ ${d.name}`}
              selected={false}
              onPress={() => {
                add([d.id], 'manual');
                setQuery('');
              }}
              testID={`cupboard-suggestion-${d.id}`}
            />
          ))}
        </View>
      </View>
      {listed.length === 0 ? (
        <EmptyState
          title="Your cupboard is empty"
          body="Add what you already have, and The Pantry won't put it on your shopping list. Salt, pepper, oil and water are always assumed."
          testID="cupboard-empty"
        />
      ) : (
        <View>
          <SectionHeader title={`In the cupboard · ${listed.length}`} />
          {listed.map((d) => (
            <View key={d.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }} testID={`cupboard-item-${d.id}`}>
                <Text variant="body" style={{ flex: 1 }}>
                  {d.name}
                </Text>
                <IconButton
                  icon="close"
                  label={`Remove ${d.name}`}
                  colour="inkMuted"
                  onPress={() => {
                    remove(d.id);
                    toast({ message: `${d.name} used up`, undo: () => add([d.id], 'manual') });
                  }}
                  testID={`cupboard-item-${d.id}-remove`}
                />
              </View>
              <Divider />
            </View>
          ))}
        </View>
      )}
      <Switch
        label="Move ticked shopping here"
        detail="When you tick something off the list, it goes into the cupboard"
        value={moveTickedToCupboard}
        onChange={setMoveTicked}
        testID="cupboard-move-ticked"
      />
      {canMake.length ? (
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="What can I make?" />
          {canMake.map(({ recipe, coverage }) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              image={RECIPE_IMAGES[recipe.id]}
              size="row"
              note={coverage.missing.length === 0 ? 'You have everything' : `You have ${coverage.have} of ${coverage.needed}`}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
              testID={`cupboard-make-${recipe.id}`}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
