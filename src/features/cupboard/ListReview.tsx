// The check-before-it-goes-in list (D-030): what we understood, ticked or not,
// for "Add a list" and for receipt and photo scans alike. Nothing lands in the
// cupboard without the cook seeing it here.
import { View } from 'react-native';

import type { ListGuess } from '@/domain/cupboard/addList';
import { ingredientName } from '@/store/cookable';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { capitalise } from './CupboardParts';

export type ReviewGuess = ListGuess & { note?: string | undefined; unsure?: boolean | undefined };

type Props = {
  guesses: readonly ReviewGuess[];
  have: ReadonlySet<string>;
  ticked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** testIDs are `<prefix>-item-<id>`. */
  testIDPrefix: string;
};

export function ListReview({ guesses, have, ticked, onToggle, testIDPrefix }: Props) {
  return (
    <View style={{ gap: SPACE.md }}>
      <Text variant="meta">Untick anything we got wrong.</Text>
      {guesses.map((g, i) => {
        const id = g.id;
        if (!id) {
          return (
            <Text key={`unknown-${i}`} variant="bodySmall" colour="inkMuted">
              {`“${g.text}”: not one we know yet, so it's skipped. Try a simpler word, like “rice”.`}
            </Text>
          );
        }
        const detail = have.has(id)
          ? 'Already in your cupboard'
          : g.unsure
            ? `Not sure about this one. Tick it if it's right.`
            : (g.note ?? `from “${g.text}”`);
        return (
          <Checkbox
            key={`${id}-${i}`}
            label={capitalise(ingredientName(id))}
            detail={detail}
            checked={ticked.has(id)}
            strikeWhenChecked={false}
            onToggle={() => {
              if (!have.has(id)) onToggle(id);
            }}
            testID={`${testIDPrefix}-item-${id}`}
          />
        );
      })}
    </View>
  );
}

/** A toggle for a ticked set, for the screens that hold one. */
export function toggled(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
