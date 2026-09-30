// The Shopping list tab (spec §4.13), in v1's shape: a head row with the
// count, "By aisle" and "Clear all", then the list in soft cards. v2 keeps
// what v1 lacked: ticking as you shop, amounts, extras you type in, and the
// things left off because they're in the cupboard. Sending the list is the
// share button at the top of the page, as in v1. Derived from the plan every
// time; only the cook's edits are stored.
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { AISLE_LABELS } from '@/domain/recipes/labels';
import {
  addExtras,
  clearList,
  deleteExtra,
  EMPTY_EDITS,
  itemsAtoZ,
  removeItem,
  restoreExtra,
  restoreRemoved,
  toggleChecked,
  toggleExtra,
  untickLeavesCupboard,
  type ShoppingItem,
  type ShoppingList,
} from '@/domain/shopping/derive';
import type { ISODate } from '@/domain/plan/week';
import { newId } from '@/lib/ids';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { useToast } from '@/ui/patterns/Toast';
import { Chip } from '@/ui/primitives/Chip';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { PLAN, SPACE } from '@/ui/tokens/type';
import { AddItemRow, itemLabel, ListCard, Pill, ShoppingRow } from './ShoppingRows';
import { useWeekList } from './useWeekList';

export function ShoppingListView({ week, weekLabel, onBrowse }: { week: ISODate; weekLabel: string; onBrowse: () => void }) {
  const toast = useToast();
  const { list, meals } = useWeekList(week);
  const edits = usePlan((s) => s.listEdits[week]) ?? EMPTY_EDITS;
  const editList = usePlan((s) => s.editList);
  const moveTicked = useCupboard((s) => s.moveTickedToCupboard);
  const cupboardItems = useCupboard((s) => s.items);
  const addToCupboard = useCupboard((s) => s.add);
  const removeFromCupboard = useCupboard((s) => s.remove);
  const [byAisle, setByAisle] = useState(true);
  const edit = (change: Parameters<typeof editList>[1]) => editList(week, change);

  const tick = (item: ShoppingItem) => {
    edit((e) => toggleChecked(e, item));
    if (!item.checked && moveTicked && INGREDIENTS.byId.has(item.key)) addToCupboard([item.key], 'shop');
    // Unticking a mis-tap takes back the move into the cupboard, so the item stays on the list (F14).
    if (item.checked && untickLeavesCupboard(cupboardItems, item.key)) removeFromCupboard(item.key);
  };
  const remove = (item: ShoppingItem) => {
    edit((e) => removeItem(e, item));
    toast({
      message: `${item.name} removed from the list`,
      undo: () => edit((e) => ({ ...e, removed: Object.fromEntries(Object.entries(e.removed).filter(([k]) => k !== item.key)) })),
    });
  };
  const clearAll = () => {
    // Undo stands in for a confirm step: the old edits come straight back,
    // including those of earlier weeks whose extras had come forward.
    const weeks = [week, ...new Set(list.extras.flatMap((x) => (x.fromWeek ? [x.fromWeek] : [])))];
    const all = usePlan.getState().listEdits;
    const before = weeks.map((w) => [w, all[w] ?? EMPTY_EDITS] as const);
    edit((e) => clearList(e, list));
    for (const x of list.extras) if (x.fromWeek) editList(x.fromWeek, (e) => deleteExtra(e, x.extra.id));
    toast({ message: 'List cleared', undo: () => before.forEach(([w, e]) => editList(w, () => e)) });
  };
  const addExtra = (text: string) => {
    const shown = list.extras.map((x) => x.extra.text);
    if (addExtras(edits, [text], newId, Date.now(), shown).added.length === 0) {
      toast({ message: `${text} is already on the list` });
      return;
    }
    edit((e) => addExtras(e, [text], newId, Date.now(), shown).edits);
  };
  // An extra carried forward still lives in its own week: delete it there. Its tick lives in this week.
  const deleteExtraRow = ({ extra, checked, fromWeek }: ShoppingList['extras'][number]) => {
    const home = fromWeek ?? week;
    editList(home, (e) => deleteExtra(e, extra.id));
    if (fromWeek) edit((e) => deleteExtra(e, extra.id));
    toast({
      message: `${extra.text} removed from the list`,
      undo: () => {
        editList(home, (e) => restoreExtra(e, extra, checked && !fromWeek));
        if (fromWeek && checked) edit((e) => toggleExtra(e, extra.id));
      },
    });
  };

  const items = list.sections.flatMap((s) => s.items);
  const total = items.length + list.extras.length;
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
    <View style={{ gap: PLAN.aisleGap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs }}>
        <Text variant="kickerSmall" style={{ flex: 1 }} testID="shopping-count">
          {total === 0 ? 'Nothing to buy' : toBuy === 0 ? 'All bought' : `${toBuy} ${toBuy === 1 ? 'item' : 'items'}`}
        </Text>
        <Pill label="By aisle" icon="aisles" on={byAisle} role="switch" onPress={() => setByAisle(!byAisle)} testID="shopping-by-aisle" />
        {total ? <Pill label="Clear all" onPress={clearAll} testID="shopping-clear" /> : null}
      </View>
      {groups.map((g) =>
        g.items.length ? (
          <ListCard key={g.key} title={g.title}>
            {g.items.map(row)}
          </ListCard>
        ) : null,
      )}
      <ListCard title={list.extras.length ? 'Also' : undefined}>
        {list.extras.map((row, i) => (
          <ShoppingRow
            key={row.extra.id}
            label={row.extra.text}
            checked={row.checked}
            first={i === 0}
            onToggle={() => edit((e) => toggleExtra(e, row.extra.id))}
            onRemove={() => deleteExtraRow(row)}
            removeLabel={`Remove ${row.extra.text}`}
            testID={`shopping-extra-${row.extra.id}`}
          />
        ))}
        <AddItemRow onAdd={addExtra} first={list.extras.length === 0} />
      </ListCard>
      {list.removedCount > 0 ? (
        <Pressable
          onPress={() => edit(restoreRemoved)}
          accessibilityRole="button"
          testID="shopping-restore"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xxs, paddingVertical: PLAN.rowY }}
        >
          <Icon name="refresh" size={13} colour="inkSoft" />
          <Text variant="meta" colour="inkSoft">
            {`Restore ${list.removedCount} removed ${list.removedCount === 1 ? 'item' : 'items'}`}
          </Text>
        </Pressable>
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
  const others = items.filter((i) => !INGREDIENTS.byId.get(i.key)?.staple);
  if (others.length === 0) return null;
  return (
    <View style={{ gap: SPACE.xs }}>
      <Text variant="kickerSmall" accessibilityRole="header">
        {`Already in your cupboard · ${others.length}`}
      </Text>
      <Text variant="meta">Left off the list. Running low? Tap one to add it back.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xxs }}>
        {others.map((item) => (
          <Chip
            key={item.key}
            kind="quick"
            icon="add"
            role="button"
            label={itemLabel(item)}
            accessibilityLabel={`Add ${itemLabel(item)} back to the list`}
            selected={false}
            onPress={() => onBack(item)}
            testID={`shopping-back-${item.key}`}
          />
        ))}
      </View>
    </View>
  );
}
