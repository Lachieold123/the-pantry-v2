// The Cupboard tab: "what can I cook with what I have?" (D-030). It reads in
// the order you use it: add things, see what's in, see what that cooks, and
// the shelf settings last. Every number here comes from the one shared engine
// (store/cookable). "Add one thing" and the "Stock up" grid were taken out:
// Lachlan found them bulky and clunky (6 October); search, quick adds and the
// ways in below them cover adding.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

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
import { AddBar, capitalise, CookRail } from './CupboardParts';
import { CupboardSettings } from './CupboardSettings';
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
  const { ready, nearly, quick, have } = useCookableNow();
  const ids = items.map((i) => i.ingredientId);

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
