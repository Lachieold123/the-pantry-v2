// The Cupboard tab: "what can I cook with what I have?" (D-030). It reads in
// the order you use it (D-033): add things, see what's in, the staples switch
// that decides what counts, then what that cooks, from your saved recipes and
// beyond, as v1 laid it out. Every number comes from the one shared engine
// (store/cookable).
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Screen } from '@/ui/primitives/Screen';
import { SPACE } from '@/ui/tokens/type';
import { Jars, QuickAdds } from './CupboardLists';
import { AddBar, capitalise } from './CupboardParts';
import { CupboardSettings, StaplesToggle } from './CupboardSettings';
import { MatchShelves } from './MatchShelves';
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
  const setShelf = useCupboard((s) => s.setShelf);
  const { quick, have, fromSaved, suggested } = useCookableNow();
  const ids = items.map((i) => i.ingredientId);
  const categories = new Set(ids.map((id) => KITCHEN.category(id))).size;

  const addIngredient = (id: string) => {
    add([id], 'manual');
    toast({ message: `${capitalise(ingredientName(id))} added`, undo: () => remove(id) });
  };

  // Top to bottom, the order you use it (Lachlan, 1 October): put things in, see what's
  // there, then see what that cooks.
  return (
    <Screen tab testID="cupboard-screen">
      <TitleBlock kicker="Cupboard" title="What do you have?" subtitle="Tell us what you have. We'll show what you can cook tonight." />

      <View style={{ gap: SPACE.md }}>
        <SectionHeader kicker="Step 1" title="Add what you have" />
        <AddBar have={have} onAdd={addIngredient} />
        <QuickAdds ids={quick} onAdd={addIngredient} />
        <WaysIn />
      </View>

      {ids.length === 0 ? (
        <EmptyState
          title="Your cupboard is empty"
          body="Search above, tap a quick add or paste a list. Salt, pepper, oil and water are always assumed."
          testID="cupboard-empty"
        />
      ) : (
        <>
          <View>
            <SectionHeader
              kicker={`Step 2 · ${ids.length} ${ids.length === 1 ? 'thing' : 'things'} · ${categories} ${categories === 1 ? 'category' : 'categories'}`}
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
        </>
      )}
      <StaplesToggle
        assume={shelf.mode === 'assume'}
        ticked={shelf.ids.length}
        onChange={(assume) => setShelf({ ...shelf, mode: assume ? 'assume' : 'mine' })}
      />
      {ids.length ? <MatchShelves fromSaved={fromSaved} suggested={suggested} /> : null}
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
