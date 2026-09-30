// The pieces of the Cupboard tab (D-030, cupboard-brief §4.4): the add bar,
// the "what you can cook" rail, "Add one thing", the jars and quick adds.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { needLine, type CookableMatch } from '@/domain/cupboard/cookable';
import { CUPBOARD_CATEGORIES } from '@/domain/cupboard/kitchen';
import { normaliseWords } from '@/domain/ingredients/database';
import { ingredientName } from '@/store/cookable';
import { JarChip } from '@/ui/patterns/JarChip';
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchIngredients(query, have), [query, have]);
  return (
    <View style={{ gap: SPACE.sm }}>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search ingredients to add…"
        label="Add an ingredient"
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
              // The field keeps its text so you can keep adding from the same search.
              onPress={() => (r.inCupboard ? undefined : onAdd(r.id))}
              testID={`cupboard-add-${r.id}`}
            />
          ))}
        </View>
      ) : null}
      <Button label="Add a list" icon="list" kind="soft" onPress={() => router.push('/cupboard/add-list')} testID="cupboard-add-list" />
    </View>
  );
}

export function CookRail({ ready, nearly }: { ready: CookableMatch[]; nearly: CookableMatch[] }) {
  const router = useRouter();
  const matches = [...ready, ...nearly].slice(0, RAIL);
  const kicker = [ready.length ? `${ready.length} ready` : '', nearly.length ? `${nearly.length} need 1–2` : '']
    .filter(Boolean)
    .join(' · ');
  if (matches.length === 0) {
    return (
      <View style={{ gap: SPACE.xs }}>
        <SectionHeader kicker="Tonight from your cupboard" title="Nothing close yet" />
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

type UnlockProps = { unlocks: { id: string; unlocks: number }[]; onHave: (id: string) => void; onList: (id: string) => void };

export function UnlockRows({ unlocks, onHave, onList }: UnlockProps) {
  if (unlocks.length === 0) return null;
  return (
    <View>
      <SectionHeader kicker="Add one thing" title="Get closer to dinner" />
      {unlocks.map((u) => (
        <View
          key={u.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xs }}
          testID={`unlock-${u.id}`}
        >
          <View style={{ flex: 1 }}>
            <Text variant="row">{capitalise(ingredientName(u.id))}</Text>
            <Text variant="meta">{u.unlocks === 1 ? 'Makes 1 more recipe ready' : `Makes ${u.unlocks} more recipes ready`}</Text>
          </View>
          <Button label="I have it" kind="quiet" onPress={() => onHave(u.id)} testID={`unlock-${u.id}-have`} />
          <Button label="List" icon="add" kind="secondary" onPress={() => onList(u.id)} testID={`unlock-${u.id}-list`} />
        </View>
      ))}
    </View>
  );
}

type JarProps = { ids: readonly string[]; onRemove: (id: string) => void; onClear: () => void };

export function Jars({ ids, onRemove, onClear }: JarProps) {
  const groups = CUPBOARD_CATEGORIES.map((category) => ({
    category,
    ids: ids.filter((id) => KITCHEN.category(id) === category).sort((a, b) => ingredientName(a).localeCompare(ingredientName(b))),
  })).filter((g) => g.ids.length > 0);
  return (
    <View style={{ gap: SPACE.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Text variant="kickerSection" style={{ flex: 1 }} numberOfLines={1}>
          {`Your cupboard · ${ids.length}`}
        </Text>
        <Button label="Clear" kind="destructive" onPress={onClear} testID="cupboard-clear" />
      </View>
      {groups.map((g) => (
        <View key={g.category} style={{ gap: SPACE.xs }}>
          <Text variant="kickerSmall" colour="ink" accessibilityRole="header">
            {`${CATEGORY_LABEL[g.category]} · ${g.ids.length}`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
            {g.ids.map((id) => (
              <JarChip
                key={id}
                name={ingredientName(id)}
                category={g.category}
                onRemove={() => onRemove(id)}
                testID={`cupboard-item-${id}`}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function QuickAdds({ ids, onAdd }: { ids: readonly string[]; onAdd: (id: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <View style={{ gap: SPACE.sm }}>
      <Text variant="kickerSection" accessibilityRole="header">
        Quick adds
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        {ids.map((id) => (
          <Chip
            key={id}
            icon="add"
            label={capitalise(ingredientName(id))}
            selected={false}
            onPress={() => onAdd(id)}
            testID={`quick-add-${id}`}
          />
        ))}
      </View>
    </View>
  );
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
