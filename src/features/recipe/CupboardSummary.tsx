// One card above the ingredients: how much of this recipe your cupboard
// covers, what's missing, and what to do about it (cupboard-brief §4.4).
// Its numbers come from the same tally as the HAVE pills below, and it names
// things the way this recipe does ("courgette", not the database's "zucchini").
//
// "Plan" lives once, in the action row at the top of the page: it's about the
// recipe, not the cupboard. This card's two actions are both answers to
// "what's missing?": put it on the list, or say you have it after all.
import { Pressable, View } from 'react-native';

import type { Cookable } from '@/domain/cupboard/cookable';
import type { CupboardTally } from '@/domain/cupboard/summary';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { CUPBOARD } from '@/ui/tokens/cupboard';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';

type Props = {
  result: Cookable;
  tally: CupboardTally;
  /** The recipe's own word for an ingredient. */
  wordOf: (id: string) => string;
  /** Everything missing is already an extra on this week's list. */
  onList: boolean;
  onAddMissing: () => void;
  onHaveMissing: () => void;
};

export function CupboardSummary({ result, tally, wordOf, onList, onAddMissing, onHaveMissing }: Props) {
  const styles = useStyles();
  const missing = result.missing.map(wordOf);
  const n = missing.length;
  return (
    <View style={styles.card} testID="recipe-cupboard-summary">
      <Text variant="kickerSmall" colour="accentDeep">
        From your cupboard
      </Text>
      <Text variant="row">{n === 0 ? 'You have everything for this' : `You have ${tally.have} of ${tally.total} · Need ${n}`}</Text>
      {n ? (
        <Text variant="bodySmall" colour="inkSoft">
          {missing.join(', ')}
        </Text>
      ) : null}
      {result.shelf.length ? (
        <Text variant="caption" colour="inkSoft">{`Check you have: ${result.shelf.map(wordOf).join(', ')}`}</Text>
      ) : null}
      {n ? (
        <View style={styles.actions}>
          <Pill
            icon={onList ? 'check' : 'basket'}
            label={onList ? 'On your list' : `Add ${n} to list`}
            a11y={onList ? 'Already on your shopping list' : `Add ${n} to your shopping list`}
            disabled={onList}
            onPress={onAddMissing}
            testID="recipe-add-missing"
          />
          <Pill
            icon="cupboard"
            label={n === 1 ? 'I have it' : 'I have these'}
            a11y={n === 1 ? `I have ${missing[0] ?? 'it'}` : `I have all ${n}`}
            onPress={onHaveMissing}
            testID="recipe-have-missing"
          />
        </View>
      ) : null}
    </View>
  );
}

type PillProps = { icon: IconName; label: string; a11y: string; disabled?: boolean; onPress: () => void; testID: string };

/** The card's two actions share one outlined shape, so neither reads as the "real" one. */
function Pill({ icon, label, a11y, disabled = false, onPress, testID }: PillProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      hitSlop={{ top: CUPBOARD.actionSlop, bottom: CUPBOARD.actionSlop }}
      testID={testID}
      style={({ pressed }) => [styles.pill, disabled && styles.pillDone, pressed && styles.pressed]}
    >
      <Icon name={icon} size={CUPBOARD.actionIcon} colour={disabled ? 'accentDeep' : 'ink'} />
      <Text variant="chip" colour={disabled ? 'accentDeep' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: { gap: SPACE.xxs, padding: SPACE.md, borderRadius: RADIUS.big, backgroundColor: colours.accentSoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xs },
  pill: {
    minHeight: CUPBOARD.actionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CUPBOARD.actionGap,
    paddingHorizontal: CUPBOARD.actionPadX,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.accent,
  },
  // Done, not broken: the border fades but the tick and words stay readable.
  pillDone: { borderColor: colours.accentSoft },
  pressed: { opacity: PRESSED.row },
}));
