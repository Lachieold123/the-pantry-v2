// The Cupboard tab: "what can I cook with what I have?" (D-030). The answer
// comes first, then the ways to change it: add, the jars, quick adds and the
// shelf. Every number here comes from the one shared engine (store/cookable).
import { useRouter } from 'expo-router';

import { ingredientName, useCookableNow } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { ListRow } from '@/ui/primitives/ListRow';
import { Screen } from '@/ui/primitives/Screen';
import { Switch } from '@/ui/primitives/Switch';
import { AddBar, capitalise, CookRail, Jars, QuickAdds, UnlockRows } from './CupboardParts';
import { StockGrid } from './StockGrid';

export function CupboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const add = useCupboard((s) => s.add);
  const remove = useCupboard((s) => s.remove);
  const clear = useCupboard((s) => s.clear);
  const restore = useCupboard((s) => s.restore);
  const moveTickedToCupboard = useCupboard((s) => s.moveTickedToCupboard);
  const setMoveTicked = useCupboard((s) => s.setMoveTicked);
  const addToList = usePlan((s) => s.addToList);
  const { ready, nearly, unlocks, quick, have } = useCookableNow();
  const ids = items.map((i) => i.ingredientId);

  const addOne = (id: string) => {
    add([id], 'manual');
    toast({ message: `${capitalise(ingredientName(id))} added`, undo: () => remove(id) });
  };
  const listOne = (id: string) => {
    const undo = addToList([{ text: capitalise(ingredientName(id)), ingredientId: id }]);
    toast({
      message: undo ? `${capitalise(ingredientName(id))} is on your shopping list` : 'Already on your shopping list',
      ...(undo ? { undo } : {}),
    });
  };

  return (
    <Screen tab testID="cupboard-screen">
      <TitleBlock kicker="Cupboard" title="What do you have?" subtitle="Tell us what you have. We'll show what you can cook tonight." />
      <AddBar have={have} onAdd={addOne} />
      {ids.length === 0 ? (
        <EmptyState
          title="Your cupboard is empty"
          body="Add a few things you have and we'll show what you can cook tonight. Salt, pepper, oil and water are always assumed."
        />
      ) : (
        <CookRail ready={ready} nearly={nearly} />
      )}
      <UnlockRows unlocks={unlocks} onHave={addOne} onList={listOne} />
      {ids.length ? (
        <Jars
          ids={ids}
          onRemove={(id) => {
            remove(id);
            toast({ message: `${capitalise(ingredientName(id))} used up`, undo: () => add([id], 'manual') });
          }}
          onClear={() => {
            // Undo stands in for a confirm step: one tap to clear, one tap to bring it all back.
            const was = clear();
            toast({ message: `Cupboard cleared (${was.length})`, undo: () => restore(was) });
          }}
        />
      ) : null}
      <QuickAdds ids={quick} onAdd={addOne} />
      <StockGrid have={have} onAdd={(id) => add([id], 'manual')} onRemove={(id) => remove(id)} />
      <ListRow
        icon="basket"
        title="Always in my kitchen"
        detail={
          shelf.mode === 'assume' ? 'Assuming a stocked spice rack, sauces and baking basics' : `${shelf.ids.length} shelf items ticked`
        }
        onPress={() => router.push('/cupboard/shelf')}
        testID="cupboard-shelf"
      />
      <Switch
        label="Move ticked shopping here"
        detail="When you tick something off the list, it goes into the cupboard"
        value={moveTickedToCupboard}
        onChange={setMoveTicked}
        testID="cupboard-move-ticked"
      />
    </Screen>
  );
}
