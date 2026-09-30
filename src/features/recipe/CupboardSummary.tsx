// One line above the ingredients: how much of this recipe your cupboard
// covers, what's missing, and a way to get it (cupboard-brief §4.4).
import { View } from 'react-native';

import type { Cookable } from '@/domain/cupboard/cookable';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

type Props = { result: Cookable; nameOf: (id: string) => string; onAddMissing: () => void; onPlan: () => void };

export function CupboardSummary({ result, nameOf, onAddMissing, onPlan }: Props) {
  const styles = useStyles();
  const covered = result.have.length + result.swaps.length;
  const total = covered + result.missing.length + result.shelf.length;
  const missing = result.missing.map(nameOf);
  return (
    <View style={styles.card} testID="recipe-cupboard-summary">
      <Text variant="kickerSmall" colour="accentDeep">
        From your cupboard
      </Text>
      <Text variant="row">
        {missing.length === 0
          ? `You have everything for this`
          : `You have ${covered + result.shelf.length} of ${total} · Need ${missing.length}`}
      </Text>
      {missing.length ? (
        <Text variant="bodySmall" colour="inkSoft">
          {missing.join(', ')}
        </Text>
      ) : null}
      {result.shelf.length ? <Text variant="caption">{`Check you have: ${result.shelf.map(nameOf).join(', ')}`}</Text> : null}
      <View style={styles.actions}>
        {missing.length ? (
          <Button
            label={`Add ${missing.length} to list`}
            icon="basket"
            kind="secondary"
            onPress={onAddMissing}
            testID="recipe-add-missing"
          />
        ) : null}
        <Button label="Plan it" icon="plan" kind="quiet" onPress={onPlan} testID="recipe-summary-plan" />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: { gap: SPACE.xxs, padding: SPACE.md, borderRadius: RADIUS.big, backgroundColor: colours.accentSoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xs },
}));
