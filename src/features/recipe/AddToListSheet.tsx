// Put a recipe's ingredients on this week's shopping list without planning it
// (D-037): for the dish you're cooking for friends on Saturday, or the three
// things you need for tonight. Everything you need starts ticked; what the
// cupboard has, staples and optional lines start unticked; lines this recipe
// already put on the list are named, not offered again. Amounts follow the
// servings chosen here and merge with the plan's on the list.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { cookable } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { shoppingWeek, toISODate } from '@/domain/plan/week';
import { capitalise, EMPTY_EDITS } from '@/domain/shopping/derive';
import { recipeKeysOnList, recipeListRows, startPicked, type RecipeListRow } from '@/domain/shopping/fromRecipe';
import { goBack } from '@/lib/navigation';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { useWeekList } from '@/store/shoppingList';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Divider } from '@/ui/primitives/Divider';
import { Sheet } from '@/ui/primitives/Sheet';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

export function AddToListSheet({ id, servings: startServings }: { id: string; servings: number | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const recipe = useRecipe(id);
  const units = usePreferences((s) => s.units);
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const addToList = usePlan((s) => s.addToList);
  // The same week "Add to list" writes to: this week, or next week from Sunday.
  const week = shoppingWeek(toISODate(new Date()));
  const { list } = useWeekList(week);
  const extras = usePlan((s) => s.listEdits[week] ?? EMPTY_EDITS).extras;
  const [servings, setServings] = useState(startServings ?? recipe?.servings ?? 4);

  const rows = useMemo(() => {
    if (!recipe) return [];
    // "Have" means what the recipe page's cupboard card means: same-family stand-ins and
    // assumed shelf items count. Lines the card doesn't weigh ("rice, to serve") count only
    // if they're in the cupboard themselves.
    const inCupboard = cupboardIds(items);
    const match = cookable(recipe, inCupboard, shelf, INGREDIENTS, KITCHEN);
    const have = new Set([...inCupboard, ...match.have, ...match.swaps.map((x) => x.need), ...match.shelf]);
    return recipeListRows({
      recipe,
      servings,
      index: INGREDIENTS,
      has: (id) => have.has(id),
      onList: recipeKeysOnList(list, extras, recipe.id),
      units,
    });
  }, [recipe, servings, items, shelf, list, extras, units]);
  // Chosen once, from what the sheet opened on; changing servings keeps your picks.
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => startPicked(rows));

  if (!recipe) {
    return (
      <Sheet title="Add to list" onClose={() => goBack(router)}>
        <Text variant="body">This recipe isn’t available any more.</Text>
      </Sheet>
    );
  }

  const toggle = (key: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const need = rows.filter((r) => r.status === 'need');
  const have = rows.filter((r) => r.status === 'have' || r.status === 'staple');
  const already = rows.filter((r) => r.status === 'on-list');
  const chosen = rows.filter((r) => r.status !== 'on-list' && picked.has(r.key));

  const add = () => {
    const undo = addToList(chosen.map((r) => r.addition));
    toast({
      message: undo ? `${chosen.length} added to your shopping list` : 'Already on your shopping list',
      ...(undo ? { undo } : {}),
    });
    goBack(router);
  };

  return (
    <Sheet title="Add to list" kicker={recipe.title} onClose={() => goBack(router)}>
      <View style={{ gap: SPACE.sm }}>
        <Text variant="kickerSection" accessibilityRole="header">
          For
        </Text>
        <Stepper
          label="Servings"
          value={servings}
          onChange={setServings}
          min={1}
          format={(n) => `${n} ${n === 1 ? 'person' : 'people'}`}
          testID="list-servings"
        />
      </View>
      <Rows title="You need" rows={need} picked={picked} onToggle={toggle} />
      <Rows title="You have these" rows={have} picked={picked} onToggle={toggle} />
      {already.length ? (
        <Text variant="caption" testID="list-already">
          {`Already on your list: ${already.map((r) => r.name).join(', ')}`}
        </Text>
      ) : null}
      <Button
        label={chosen.length ? `Add ${chosen.length} to list` : 'Pick something to add'}
        kind="primary"
        block
        disabled={chosen.length === 0}
        onPress={add}
        testID="list-confirm"
      />
    </Sheet>
  );
}

type RowsProps = { title: string; rows: readonly RecipeListRow[]; picked: ReadonlySet<string>; onToggle: (key: string) => void };

function Rows({ title, rows, picked, onToggle }: RowsProps) {
  if (!rows.length) return null;
  return (
    <View style={{ gap: SPACE.xxs }}>
      <Text variant="kickerSection" accessibilityRole="header">
        {title}
      </Text>
      <View>
        {rows.map((r) => (
          <View key={r.key}>
            <Checkbox
              label={capitalise(r.name)}
              detail={[r.amount, r.optional ? 'optional' : '', r.status === 'staple' ? 'staple' : ''].filter(Boolean).join(' · ')}
              checked={picked.has(r.key)}
              onToggle={() => onToggle(r.key)}
              strikeWhenChecked={false}
              testID={`list-row-${r.key.replace(/[^a-z0-9-]/g, '-')}`}
            />
            <Divider />
          </View>
        ))}
      </View>
    </View>
  );
}
