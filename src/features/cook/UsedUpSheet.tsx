// After cooking: "Used anything up?" The cupboard stores presence only (D-010),
// so this is how it stays true without tracking amounts. Only the fresh things
// this recipe took from your cupboard are listed, and none are ticked for you.
import { useState } from 'react';
import { View } from 'react-native';

import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { visible: boolean; ids: readonly string[]; nameOf: (id: string) => string; onFinish: (usedUp: string[]) => void };

export function UsedUpSheet({ visible, ids, nameOf, onFinish }: Props) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <ModalSheet visible={visible} onClose={() => onFinish([])} title="Used anything up?" testID="used-up-sheet">
      <View style={{ gap: SPACE.xs, paddingVertical: SPACE.xs }}>
        <Text variant="bodySmall" colour="inkSoft">
          {'Tick what’s finished and we’ll take it out of your cupboard.'}
        </Text>
        {ids.map((id) => (
          <Checkbox
            key={id}
            label={nameOf(id)}
            checked={ticked.has(id)}
            onToggle={() => toggle(id)}
            strikeWhenChecked={false}
            testID={`used-up-${id}`}
          />
        ))}
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs }}>
          <View style={{ flex: 1 }}>
            <Button label="Nothing" kind="soft" block onPress={() => onFinish([])} testID="used-up-none" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={ticked.size ? `Remove ${ticked.size}` : 'Done'}
              kind="primary"
              block
              onPress={() => onFinish([...ticked])}
              testID="used-up-done"
            />
          </View>
        </View>
      </View>
    </ModalSheet>
  );
}
