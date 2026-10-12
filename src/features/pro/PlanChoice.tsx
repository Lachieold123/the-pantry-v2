// The two ways to pay, yearly first. Prices are the store's own strings, in
// the buyer's currency, never typed in here. Each plan shows its billing
// length beside its price, and a trial says what's charged once it ends
// (App Store guideline 3.1.2; the wording lives in domain/pro/terms).
import { Pressable, View } from 'react-native';

import { planTerms } from '@/domain/pro/terms';
import type { Plan } from '@/lib/purchases';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRO } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = { plans: readonly Plan[]; chosen: Plan['id']; onChoose: (id: Plan['id']) => void };

export function PlanChoice({ plans, chosen, onChoose }: Props) {
  const styles = useStyles();
  const ordered = [...plans].sort((a) => (a.id === 'yearly' ? -1 : 1));
  return (
    <View style={{ gap: SPACE.xs }} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
      {ordered.map((plan) => {
        const on = plan.id === chosen;
        const terms = planTerms(plan);
        return (
          <Pressable
            key={plan.id}
            onPress={() => onChoose(plan.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={terms.spoken}
            testID={`pro-plan-${plan.id}`}
            style={({ pressed }) => [styles.plan, on && styles.planOn, pressed && { opacity: PRESSED.row }]}
          >
            <Icon name={on ? 'checkCircle' : 'circle'} size={PRO.planIcon} colour={on ? 'accentText' : 'inkMuted'} />
            <View style={{ flex: 1, gap: SPACE.xxs }}>
              <View style={styles.heading}>
                <Text variant="row">{terms.name}</Text>
                <Text variant="row" testID={`pro-plan-${plan.id}-price`}>
                  {terms.price}
                </Text>
              </View>
              <Text variant="caption">{terms.detail}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TAP_TARGET,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
  },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: SPACE.sm },
  planOn: { borderColor: colours.accent, backgroundColor: colours.accentSoft },
}));
