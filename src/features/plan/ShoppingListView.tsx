// The list itself: by aisle, tick as you shop, add extras, send it on.
import { useState } from 'react';
import { Share, View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { AISLE_LABELS } from '@/domain/recipes/labels';
import { capitalise, formatListForSharing, removeItem, restoreRemoved, toggleChecked, type ShoppingItem } from '@/domain/shopping/derive';
import type { ISODate } from '@/domain/plan/week';
import { newId } from '@/lib/ids';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { useWeekList } from './useWeekList';

export function ShoppingListView({ week, weekLabel, onBrowse }: { week: ISODate; weekLabel: string; onBrowse: () => void }) {
  const toast = useToast();
  const { list, meals } = useWeekList(week);
  const editList = usePlan((s) => s.editList);
  const moveTicked = useCupboard((s) => s.moveTickedToCupboard);
  const addToCupboard = useCupboard((s) => s.add);
  const removeFromCupboard = useCupboard((s) => s.remove);
  const [extra, setExtra] = useState('');
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

  const toBuy = list.sections.reduce((n, s) => n + s.items.filter((i) => !i.checked).length, 0);
  if (meals === 0 && list.extras.length === 0) {
    return (
      <EmptyState
        title="Your list is empty"
        body={`Plan a few meals for ${weekLabel.toLowerCase()} and everything you need appears here, sorted by aisle.`}
        action={{ label: 'Browse recipes', onPress: onBrowse }}
      />
    );
  }

  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="meta">{toBuy === 0 ? 'All done' : `${toBuy} to buy for ${meals} ${meals === 1 ? 'meal' : 'meals'}`}</Text>
        <Button label="Send list" icon="share" onPress={() => void share()} />
      </View>
      {list.sections.map((section) => (
        <View key={section.aisle}>
          <SectionHeader title={AISLE_LABELS[section.aisle]} />
          {section.items.map((item) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Checkbox
                  label={item.optional ? `${capitalise(item.name)} (optional)` : capitalise(item.name)}
                  detail={item.amount}
                  checked={item.checked}
                  onToggle={() => tick(item)}
                />
              </View>
              <IconButton icon="close" label={`Remove ${item.name}`} onPress={() => remove(item)} colour="inkMuted" />
            </View>
          ))}
        </View>
      ))}
      <View style={{ gap: SPACE.xs }}>
        <SectionHeader title="Also" />
        {list.extras.map(({ extra: x, checked }) => (
          <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Checkbox
                label={x.text}
                checked={checked}
                onToggle={() =>
                  edit((e) => ({ ...e, checkedExtras: checked ? e.checkedExtras.filter((i) => i !== x.id) : [...e.checkedExtras, x.id] }))
                }
              />
            </View>
            <IconButton
              icon="close"
              label={`Remove ${x.text}`}
              onPress={() => edit((e) => ({ ...e, extras: e.extras.filter((i) => i.id !== x.id) }))}
              colour="inkMuted"
            />
          </View>
        ))}
        <TextField
          label="Add something else"
          placeholder="Dishwashing liquid"
          value={extra}
          onChangeText={setExtra}
          onSubmitEditing={addExtra}
          returnKeyType="done"
          maxLength={60}
        />
      </View>
      {list.removedCount > 0 ? (
        <Button
          label={`Restore ${list.removedCount} removed ${list.removedCount === 1 ? 'item' : 'items'}`}
          kind="quiet"
          onPress={() => edit(restoreRemoved)}
        />
      ) : null}
      {list.inCupboard.length > 0 ? (
        <View style={{ gap: SPACE.xs }}>
          <SectionHeader title="In your cupboard" />
          <Text variant="meta">
            Not on the list because you have them. Running low? Tap to add it back. Always assumed:{' '}
            {list.inCupboard
              .filter((i) => INGREDIENTS.byId.get(i.key)?.staple)
              .map((i) => i.name)
              .join(', ') || 'salt, pepper, oil and water'}
            .
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
            {list.inCupboard.map((item) => {
              const staple = INGREDIENTS.byId.get(item.key)?.staple ?? false;
              return staple ? null : (
                <Button
                  key={item.key}
                  label={item.name}
                  kind="quiet"
                  accessibilityHint="Adds it back to the shopping list"
                  onPress={() => {
                    removeFromCupboard(item.key);
                    toast({ message: `${item.name} is back on the list`, undo: () => addToCupboard([item.key], 'manual') });
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
