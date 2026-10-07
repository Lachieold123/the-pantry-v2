// The two ways to pay, yearly first. Prices are the store's own strings, in
// the buyer's currency, never typed in here. The trial line says plainly
// what happens and when, because a surprise charge is the fastest way to a
// one-star review.
import { Pressable, View } from 'react-native';

import type { Plan } from '@/lib/purchases';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRO } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = { plans: readonly Plan[]; chosen: Plan['id']; onChoose: (id: Plan['id']) => void };

export function planLine(plan: Plan): string {
  return plan.trialDays ? `${plan.trialDays} days free, then ${plan.price} ${plan.period}` : `${plan.price} ${plan.period}`;
}

export function PlanChoice({ plans, chosen, onChoose }: Props) {
  const styles = useStyles();
  const ordered = [...plans].sort((a) => (a.id === 'yearly' ? -1 : 1));
  return (
    <View style={{ gap: SPACE.xs }} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
      {ordered.map((plan) => {
        const on = plan.id === chosen;
        return (
          <Pressable
            key={plan.id}
            onPress={() => onChoose(plan.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${plan.id === 'yearly' ? 'Yearly' : 'Monthly'}, ${planLine(plan)}`}
            testID={`pro-plan-${plan.id}`}
            style={({ pressed }) => [styles.plan, on && styles.planOn, pressed && { opacity: PRESSED.row }]}
          >
            <Icon name={on ? 'checkCircle' : 'circle'} size={PRO.planIcon} colour={on ? 'accentText' : 'inkMuted'} />
            <View style={{ flex: 1, gap: SPACE.xxs }}>
              <Text variant="row">{plan.id === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
              {/* Muted grey is 4.4:1 on the chosen plan's amber wash; the softer ink passes AA. */}
              <Text variant="caption" colour={on ? 'inkSoft' : 'inkMuted'}>
                {planLine(plan)}
              </Text>
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
  planOn: { borderColor: colours.accent, backgroundColor: colours.accentSoft },
}));
