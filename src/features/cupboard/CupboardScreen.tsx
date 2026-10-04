// The Cupboard tab: "what can I cook with what I have?" (D-030). It reads in
// the order you use it: add things, see what's in, see what that cooks, then
// what one more thing would unlock, and the shelf settings last. Every number
// here comes from the one shared engine (store/cookable).
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ingredientName, useCookableNow } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { SPACE } from '@/ui/tokens/type';
import { Jars, QuickAdds, UnlockRows } from './CupboardLists';
import { AddBar, capitalise, CookRail } from './CupboardParts';
import { CupboardSettings } from './CupboardSettings';
import { StockGrid } from './StockGrid';
import { WaysIn } from './WaysIn';

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

  const stock = <StockGrid have={have} onAdd={(id) => add([id], 'manual')} onRemove={(id) => remove(id)} />;

  // Top to bottom, the order you use it (Lachlan, 1 October): put things in, see what's
  // there, see what that cooks, then what one more thing would unlock.
  return (
    <Screen tab testID="cupboard-screen">
      <TitleBlock kicker="Cupboard" title="What do you have?" subtitle="Tell us what you have. We'll show what you can cook tonight." />

      <View style={{ gap: SPACE.md }}>
        <SectionHeader kicker="Step 1" title="Add what you have" />
        <AddBar have={have} onAdd={addOne} />
        <QuickAdds ids={quick} onAdd={addOne} />
        <WaysIn />
      </View>

      {ids.length === 0 ? (
        <>
          <EmptyState
            title="Your cupboard is empty"
            body="Search above, paste a list, or tap what you have below. Salt, pepper, oil and water are always assumed."
            testID="cupboard-empty"
          />
          {stock}
        </>
      ) : (
        <>
          <View>
            <SectionHeader
              kicker={`Step 2 · ${ids.length} ${ids.length === 1 ? 'thing' : 'things'}`}
              title="What's in your cupboard"
              action={
                <Button
                  label="Clear"
                  kind="destructive"
                  onPress={() => {
                    // Undo stands in for a confirm step: one tap to clear, one tap to bring it all back.
                    const was = clear();
                    toast({ message: `Cupboard cleared (${was.length})`, undo: () => restore(was) });
                  }}
                  testID="cupboard-clear"
                />
              }
            />
            <Jars
              ids={ids}
              onRemove={(id) => {
                remove(id);
                toast({ message: `${capitalise(ingredientName(id))} used up`, undo: () => add([id], 'manual') });
              }}
            />
          </View>
          <CookRail ready={ready} nearly={nearly} />
          <UnlockRows unlocks={unlocks} onHave={addOne} onList={listOne} />
          {stock}
        </>
      )}
      <CupboardSettings
        shelfDetail={
          shelf.mode === 'assume' ? 'Assuming a stocked spice rack, sauces and baking basics' : `${shelf.ids.length} shelf items ticked`
        }
        onShelf={() => router.push('/cupboard/shelf')}
        moveTicked={moveTickedToCupboard}
        onMoveTicked={setMoveTicked}
      />
    </Screen>
  );
}
