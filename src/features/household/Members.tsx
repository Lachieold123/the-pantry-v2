// Who's in the household, with a way to take someone out (SEC-15): an
// ex-flatmate, or a phone nobody uses any more. It asks once before removing.
// What they planned or ticked stays; they keep their own copy on their phone.
import { useState } from 'react';
import { View } from 'react-native';

import { removeMember, type Household } from '@/store/household';
import { useToast } from '@/ui/patterns/Toast';
import { Avatar } from '@/ui/primitives/Avatar';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { HOUSEHOLD } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PROBLEM_WORDS } from './words';

export function Members({ household, me }: { household: Household; me: string | undefined }) {
  const toast = useToast();
  const [asking, setAsking] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const remove = async (userId: string, name: string) => {
    setBusy(true);
    const r = await removeMember(userId);
    setBusy(false);
    setAsking(undefined);
    toast({ message: r.ok ? `${name} is no longer in ${household.name}` : PROBLEM_WORDS[r.problem] });
  };

  return (
    <View style={{ gap: SPACE.sm }} testID="household-members">
      {household.members.map((m) => (
        <View key={m.userId} style={{ gap: SPACE.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Avatar name={m.name} size={HOUSEHOLD.avatar} />
            <Text variant="row" style={{ flex: 1 }}>
              {m.userId === me ? `${m.name} (you)` : m.name}
            </Text>
            {m.userId !== me && asking !== m.userId ? (
              <Button label="Remove" kind="quiet" onPress={() => setAsking(m.userId)} testID={`household-remove-${m.userId}`} />
            ) : null}
          </View>
          {asking === m.userId ? (
            <View style={{ gap: SPACE.xs }}>
              <Text variant="bodySmall" colour="inkSoft">
                {`Remove ${m.name}? They stop sharing ${household.name}. What they planned or ticked stays here.`}
              </Text>
              <Button
                label={`Remove ${m.name}`}
                kind="destructive"
                block
                busy={busy}
                disabled={busy}
                onPress={() => void remove(m.userId, m.name)}
                testID="household-remove-confirm"
              />
              <Button
                label="Keep them"
                kind="quiet"
                disabled={busy}
                onPress={() => setAsking(undefined)}
                testID="household-remove-cancel"
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
