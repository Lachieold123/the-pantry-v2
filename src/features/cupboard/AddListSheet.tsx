// "Add a list": type or paste what you've got, check what we understood, add
// it all in one go. The review step is the one photo and receipt scans will
// use too (D-030), so nothing lands in the cupboard without the cook seeing it.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { readPantryList, type ListGuess } from '@/domain/cupboard/addList';
import { goBackOr } from '@/lib/navigation';
import { ingredientName } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { capitalise } from './CupboardParts';

export function AddListSheet() {
  const router = useRouter();
  const toast = useToast();
  const items = useCupboard((s) => s.items);
  const add = useCupboard((s) => s.add);
  const restore = useCupboard((s) => s.restore);
  const [text, setText] = useState('');
  const [guesses, setGuesses] = useState<ListGuess[] | undefined>(undefined);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const have = new Set(items.map((i) => i.ingredientId));

  const read = () => {
    const got = readPantryList(text, INGREDIENTS);
    setGuesses(got);
    setTicked(new Set(got.flatMap((g) => (g.id && !have.has(g.id) ? [g.id] : []))));
  };
  const commit = () => {
    const before = items;
    add([...ticked], 'list');
    toast({ message: `${ticked.size} added to your cupboard`, undo: () => restore(before) });
    goBackOr(router);
  };

  return (
    <Sheet kicker="Cupboard" title="Add a list" onClose={() => goBackOr(router)}>
      {guesses === undefined ? (
        <View style={{ gap: SPACE.md }}>
          <TextField
            label="What have you got?"
            hint="Type or paste, one per line or separated by commas"
            placeholder={'eggs, 2 onions, half a cabbage, feta'}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            testID="add-list-input"
          />
          <Button label="Read my list" kind="primary" block disabled={!text.trim()} onPress={read} testID="add-list-read" />
        </View>
      ) : (
        <View style={{ gap: SPACE.md }}>
          <Text variant="meta">Untick anything we got wrong.</Text>
          {guesses.map((g, i) =>
            g.id ? (
              <Checkbox
                key={`${g.id}-${i}`}
                label={capitalise(ingredientName(g.id))}
                detail={have.has(g.id) ? 'Already in your cupboard' : `from “${g.text}”`}
                checked={ticked.has(g.id)}
                strikeWhenChecked={false}
                onToggle={() => {
                  const id = g.id;
                  if (!id || have.has(id)) return;
                  setTicked((t) => {
                    const next = new Set(t);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                testID={`add-list-item-${g.id}`}
              />
            ) : (
              <Text key={`unknown-${i}`} variant="bodySmall" colour="inkMuted">
                {`“${g.text}”: not one we know yet, so it's skipped. Try a simpler word, like “rice”.`}
              </Text>
            ),
          )}
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Edit list" kind="soft" block onPress={() => setGuesses(undefined)} testID="add-list-edit" />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={ticked.size ? `Add ${ticked.size}` : 'Nothing to add'}
                kind="primary"
                block
                disabled={ticked.size === 0}
                onPress={commit}
                testID="add-list-commit"
              />
            </View>
          </View>
        </View>
      )}
    </Sheet>
  );
}
