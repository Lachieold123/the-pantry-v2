// The cupboard: what you have, and what that lets you make tonight.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CATALOGUE, INGREDIENTS } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { cupboardIds, whatCanIMake } from '@/domain/cupboard/match';
import { normaliseWords } from '@/domain/ingredients/database';
import { useCupboard } from '@/store/cupboard';
import { useSaved } from '@/store/saved';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Chip } from '@/ui/primitives/Chip';
import { Divider } from '@/ui/primitives/Divider';
import { IconButton } from '@/ui/primitives/IconButton';
import { SearchField } from '@/ui/primitives/SearchField';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const ALL = [...INGREDIENTS.byId.values()].filter((d) => !d.staple).sort((a, b) => a.name.localeCompare(b.name));
const SUGGESTIONS = 8;

export function CupboardView() {
  const router = useRouter();
  const toast = useToast();
  const { items, add, remove, moveTickedToCupboard, setMoveTicked } = useCupboard();
  const hidden = useSaved((s) => s.hidden);
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
        CATALOGUE.filter((r) => !hidden.includes(r.id)),
        have,
        INGREDIENTS,
        6,
      ),
    [have, hidden],
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
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <SearchField value={query} onChange={setQuery} placeholder="Add an ingredient" label="Add an ingredient to the cupboard" />
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
            />
          ))}
        </View>
      </View>
      {listed.length === 0 ? (
        <EmptyState
          title="Your cupboard is empty"
          body="Add what you already have, and The Pantry won't put it on your shopping list. Salt, pepper, oil and water are always assumed."
        />
      ) : (
        <View>
          <SectionHeader title={`In the cupboard · ${listed.length}`} />
          {listed.map((d) => (
            <View key={d.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
