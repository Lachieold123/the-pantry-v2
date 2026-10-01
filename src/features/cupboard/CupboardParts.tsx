// The pieces of the Cupboard tab (D-030, cupboard-brief §4.4): the add bar
// and the "what you can cook" rail. The lists below them (Add one thing, the
// jars, quick adds) are in CupboardLists.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { needLine, type CookableMatch } from '@/domain/cupboard/cookable';
import { CUPBOARD_CATEGORIES } from '@/domain/cupboard/kitchen';
import { normaliseWords } from '@/domain/ingredients/database';
import { ingredientName } from '@/store/cookable';
import { MatchCard } from '@/ui/patterns/MatchCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { SearchField } from '@/ui/primitives/SearchField';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const ALL = [...INGREDIENTS.byId.values()].filter((d) => !d.staple).sort((a, b) => a.name.localeCompare(b.name));
const SUGGESTIONS = 8;
const RAIL = 10;
export const CATEGORY_LABEL: Record<(typeof CUPBOARD_CATEGORIES)[number], string> = {
  proteins: 'Proteins',
  vegetables: 'Vegetables',
  fruit: 'Fruit',
  dairy: 'Dairy & eggs',
  herbs: 'Herbs & spices',
  sauces: 'Sauces',
  pantry: 'Pantry',
  other: 'Other',
};

/** Ranks names so "rice" finds rice before rice paper: exact, then starts-with, then any word. */
function searchIngredients(query: string, have: ReadonlySet<string>) {
  const words = normaliseWords(query);
  if (!words.length) return [];
  const scored = ALL.map((d) => {
    // An alias only counts when the search hits its main word: "garlic naan" is naan, so "garl" shouldn't find it.
    const aliases = d.aliases.map((a) => normaliseWords(a)).filter((a) => words.some((w) => a[a.length - 1]?.startsWith(w)));
    const names = [normaliseWords(d.name), ...aliases];
    if (!words.every((w) => names.some((n) => n.some((nw) => nw.startsWith(w))))) return undefined;
    const joined = words.join(' ');
    const exact = names.some((n) => n.join(' ') === joined) ? 0 : normaliseWords(d.name).join(' ').startsWith(joined) ? 1 : 2;
    return { d, exact };
  }).filter((x) => x !== undefined);
  return scored
    .sort((a, b) => a.exact - b.exact || a.d.name.length - b.d.name.length)
    .slice(0, SUGGESTIONS)
    .map(({ d }) => ({ id: d.id, name: d.name, inCupboard: have.has(d.id) }));
}

export function AddBar({ have, onAdd }: { have: ReadonlySet<string>; onAdd: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchIngredients(query, have), [query, have]);
  // Adding empties the field (as v1 did) so the next thing can be typed straight away;
  // the page keeps taps "handled", so the keyboard stays up.
  const pick = (id: string) => {
    onAdd(id);
    setQuery('');
  };
  return (
    <View style={{ gap: SPACE.sm }}>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search ingredients to add…"
        label="Add an ingredient"
        onSubmit={() => {
          // Return adds the best match, so "rice ⏎" is enough. Something already in stays put.
          const top = results[0];
          if (top && !top.inCupboard) pick(top.id);
        }}
        testID="cupboard-search"
      />
      {query.trim() && results.length === 0 ? (
        <Text variant="meta">No ingredient by that name. Try a simpler word, like “rice”.</Text>
      ) : null}
      {results.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          {results.map((r) => (
            <Chip
              key={r.id}
              kind="quick"
              icon={r.inCupboard ? 'check' : 'add'}
              label={r.inCupboard ? `${r.name} · in cupboard` : r.name}
              selected={r.inCupboard}
              onPress={() => (r.inCupboard ? undefined : pick(r.id))}
              testID={`cupboard-add-${r.id}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CookRail({ ready, nearly }: { ready: CookableMatch[]; nearly: CookableMatch[] }) {
  const router = useRouter();
  const matches = [...ready, ...nearly].slice(0, RAIL);
  const kicker = ['Step 3', ready.length ? `${ready.length} ready` : '', nearly.length ? `${nearly.length} need 1–2` : '']
    .filter(Boolean)
    .join(' · ');
  if (matches.length === 0) {
    return (
      <View style={{ gap: SPACE.xs }}>
        <SectionHeader kicker="Step 3 · What you can cook" title="Nothing close yet" />
        <Text variant="body" colour="inkSoft">
          Most recipes need a few more things. Add what else you have, or try one of the ideas below.
        </Text>
      </View>
    );
  }
  return (
    <View>
      <SectionHeader
        kicker={kicker}
        title="What you can cook"
        action={<Button label="See all" kind="quiet" onPress={() => router.push('/cupboard/cookable')} testID="cupboard-see-all" />}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACE.gutter }}
        contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter, alignItems: 'flex-start' }}
      >
        {matches.map((m) => (
          <MatchCard
            key={m.recipe.id}
            recipe={m.recipe}
            image={RECIPE_IMAGES[m.recipe.id]}
            ready={m.tier === 'ready'}
            need={needLine(m.result, ingredientName)}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: m.recipe.id } })}
            testID={`match-${m.recipe.id}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
