// The list itself (spec §4.13): send it on, then by aisle (or A–Z), tick as
// you shop, add extras, clear it all with undo. Derived from the plan every
// time; only the cook's edits are stored.
import { useState } from 'react';
import { Share, View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { AISLE_LABELS } from '@/domain/recipes/labels';
import {
  clearList,
  EMPTY_EDITS,
  formatListForSharing,
  itemsAtoZ,
  removeItem,
  restoreRemoved,
  toggleChecked,
  type ShoppingItem,
} from '@/domain/shopping/derive';
import type { ISODate } from '@/domain/plan/week';
import { newId } from '@/lib/ids';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { itemLabel, ListCard, ShoppingRow } from './ShoppingRows';
import { useWeekList } from './useWeekList';

export function ShoppingListView({ week, weekLabel, onBrowse }: { week: ISODate; weekLabel: string; onBrowse: () => void }) {
  const toast = useToast();
  const { list, meals } = useWeekList(week);
  const edits = usePlan((s) => s.listEdits[week]) ?? EMPTY_EDITS;
  const editList = usePlan((s) => s.editList);
  const moveTicked = useCupboard((s) => s.moveTickedToCupboard);
  const addToCupboard = useCupboard((s) => s.add);
  const removeFromCupboard = useCupboard((s) => s.remove);
  const [extra, setExtra] = useState('');
  const [byAisle, setByAisle] = useState(true);
  const edit = (change: Parameters<typeof editList>[1]) => editList(week, change);

  const tick = (item: ShoppingItem) => {
    edit((e) => toggleChecked(e, item));
    if (!item.checked && moveTicked && INGREDIENTS.byId.has(item.key)) addToCupboard([item.key], 'shop');
  };
  const remove = (item: ShoppingItem) => {
    edit((e) => removeItem(e, item));
    toast({
      message: `${item.name} removed from the list`,
      undo: () => edit((e) => ({ ...e, removed: Object.fromEntries(Object.entries(e.removed).filter(([k]) => k !== item.key)) })),
    });
  };
  const clearAll = () => {
    // Undo stands in for a confirm step: the old edits come straight back.
    const before = edits;
    edit((e) => clearList(e, list));
    toast({ message: 'List cleared', undo: () => edit(() => before) });
  };
  const addExtra = () => {
    const text = extra.trim();
    if (!text) return;
    edit((e) => ({ ...e, extras: [...e.extras, { id: newId(), text, addedAt: Date.now() }] }));
    setExtra('');
  };
  const share = async () => {
    try {
      await Share.share({ message: formatListForSharing(list, (a) => AISLE_LABELS[a], `Shopping list, ${weekLabel.toLowerCase()}`) });
    } catch {
      toast({ message: "Couldn't open sharing. Try again." });
    }
  };

  const items = list.sections.flatMap((s) => s.items);
  const toBuy = items.filter((i) => !i.checked).length + list.extras.filter((x) => !x.checked).length;
  const groups = byAisle
    ? list.sections.map((s) => ({ key: s.aisle, title: AISLE_LABELS[s.aisle], items: s.items }))
    : [{ key: 'all', title: undefined, items: itemsAtoZ(list) }];
  const row = (item: ShoppingItem, i: number) => (
    <ShoppingRow
      key={item.key}
      label={itemLabel(item)}
      detail={item.amount}
      checked={item.checked}
      first={i === 0}
      onToggle={() => tick(item)}
      onRemove={() => remove(item)}
      removeLabel={`Remove ${item.name}`}
      testID={`shopping-item-${item.key}`}
    />
  );

  if (meals === 0 && list.extras.length === 0 && list.removedCount === 0) {
    return (
      <EmptyState
        title="Your list is empty"
        body={`Plan a few meals for ${weekLabel.toLowerCase()} and everything you need appears here, sorted by aisle.`}
        action={{ label: 'Browse recipes', onPress: onBrowse }}
        testID="shopping-empty"
      />
    );
  }

  return (
    <View style={{ gap: SPACE.lg }}>
      <Button label="Send list" icon="send" kind="primary" onPress={() => void share()} testID="shopping-share" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs }}>
        <Text variant="kickerSmall" colour="inkMuted" style={{ flex: 1 }} testID="shopping-count">
          {items.length + list.extras.length === 0
            ? 'Nothing to buy'
            : toBuy === 0
              ? 'All bought'
              : `${toBuy} ${toBuy === 1 ? 'item' : 'items'} · ${meals} ${meals === 1 ? 'meal' : 'meals'}`}
        </Text>
        <Chip
          label="By aisle"
          icon="aisles"
          kind="quick"
          selected={byAisle}
          onPress={() => setByAisle(!byAisle)}
          testID="shopping-by-aisle"
        />
        {items.length || list.extras.length ? <Button label="Clear all" kind="quiet" onPress={clearAll} testID="shopping-clear" /> : null}
      </View>
      {groups.map((g) =>
        g.items.length ? (
          <ListCard key={g.key} title={g.title}>
            {g.items.map(row)}
          </ListCard>
        ) : null,
      )}
      {list.extras.length ? (
        <ListCard title="Also">
          {list.extras.map(({ extra: x, checked }, i) => (
            <ShoppingRow
              key={x.id}
              label={x.text}
              checked={checked}
              first={i === 0}
              onToggle={() =>
                edit((e) => ({ ...e, checkedExtras: checked ? e.checkedExtras.filter((id) => id !== x.id) : [...e.checkedExtras, x.id] }))
              }
              onRemove={() => edit((e) => ({ ...e, extras: e.extras.filter((item) => item.id !== x.id) }))}
              removeLabel={`Remove ${x.text}`}
              testID={`shopping-extra-${x.id}`}
            />
          ))}
        </ListCard>
      ) : null}
      <TextField
        label="Add something else"
        placeholder="Dishwashing liquid"
        value={extra}
        onChangeText={setExtra}
        onSubmitEditing={addExtra}
        returnKeyType="done"
        maxLength={60}
        testID="shopping-add-extra"
      />
      {list.removedCount > 0 ? (
        <Button
          label={`Restore ${list.removedCount} removed ${list.removedCount === 1 ? 'item' : 'items'}`}
          icon="refresh"
          kind="quiet"
          onPress={() => edit(restoreRemoved)}
          testID="shopping-restore"
        />
      ) : null}
      <InCupboard
        items={list.inCupboard}
        onBack={(item) => {
          removeFromCupboard(item.key);
          toast({ message: `${item.name} is back on the list`, undo: () => addToCupboard([item.key], 'manual') });
        }}
      />
    </View>
  );
}

/** Things left off because you have them: shown quietly, never dropped (D-010). Tap one to put it back. */
function InCupboard({ items, onBack }: { items: ShoppingItem[]; onBack: (item: ShoppingItem) => void }) {
  if (items.length === 0) return null;
  const staples = items.filter((i) => INGREDIENTS.byId.get(i.key)?.staple).map((i) => i.name);
  const others = items.filter((i) => !INGREDIENTS.byId.get(i.key)?.staple);
  return (
    <View style={{ gap: SPACE.xs }}>
      <SectionHeader title="In your cupboard" />
      <Text variant="meta">
        {`Not on the list because you have them. Running low? Tap to add it back. Always assumed: ${staples.join(', ') || 'salt, pepper, oil and water'}.`}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        {others.map((item) => (
          <Button
            key={item.key}
            label={item.name}
            kind="quiet"
            accessibilityHint="Adds it back to the shopping list"
            onPress={() => onBack(item)}
            testID={`shopping-back-${item.key}`}
          />
        ))}
      </View>
    </View>
  );
}
