// Home's first-run checklist (v1's FirstRunChecklist, spec §7): a card at the
// top of Home after the welcome, with a count ring, a close button and a row
// of steps to swipe. Each step opens the place it's done, and ticks itself off
// once it really has been (store/checklist works that out). It goes for good
// when every step is done or the cook closes it.
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import type { ChecklistStepId } from '@/domain/welcome/checklist';
import { useChecklist, useFirstRunChecklist } from '@/store/checklist';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { CHECKLIST } from '@/ui/tokens/screens';
import { ICON, PRESSED, SHADOW, SPACE } from '@/ui/tokens/type';

const STEPS: Readonly<Record<ChecklistStepId, { icon: IconName; title: string; line: string; href: Href }>> = {
  cupboard: { icon: 'cupboard', title: 'Fill your cupboard', line: 'See what you can cook now', href: '/cupboard' },
  plan: { icon: 'plan', title: 'Plan a dinner', line: 'Your list writes itself', href: '/plan' },
  save: { icon: 'saved', title: 'Save a recipe', line: 'Keep it in Cookmarks', href: '/browse' },
  cook: { icon: 'dice', title: 'Cook something', line: 'Let Surprise me choose', href: '/surprise' },
  household: { icon: 'people', title: 'Share your kitchen', line: 'Plan and shop together', href: '/household' },
};

export function FirstRunChecklist() {
  const styles = useStyles();
  const router = useRouter();
  const { steps, done, total, visible } = useFirstRunChecklist();
  const dismiss = useChecklist((s) => s.dismiss);
  if (!visible) return null;
  return (
    <View style={styles.card} testID="checklist">
      <View style={styles.head}>
        <View style={styles.ring} accessibilityLabel={`${done} of ${total} done`} testID="checklist-count">
          <Text variant="numberDay" colour="ink">{`${done}/${total}`}</Text>
        </View>
        <View style={styles.fill}>
          <Text variant="kickerSection" colour="accentText">
            Getting started
          </Text>
          <Text variant="cardTitleLarge" colour="ink" accessibilityRole="header">
            A few things to try first
          </Text>
        </View>
        <IconButton icon="close" label="Close the checklist" onPress={dismiss} colour="inkMuted" testID="checklist-dismiss" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
        {steps.map(({ id, done: isDone }) => {
          const s = STEPS[id];
          return (
            <Pressable
              key={id}
              onPress={() => router.push(s.href)}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}. ${s.line}`}
              accessibilityState={{ checked: isDone }}
              testID={`checklist-${id}`}
              style={({ pressed }) => [styles.step, pressed && styles.pressed]}
            >
              <Icon name={isDone ? 'checkCircle' : s.icon} size={ICON.standard} colour={isDone ? 'accentDeep' : 'ink'} />
              <View style={styles.fill}>
                <Text variant="name" colour="ink" numberOfLines={2}>
                  {s.title}
                </Text>
                <Text variant="meta" colour="inkMuted" numberOfLines={2}>
                  {isDone ? 'Done' : s.line}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: {
    gap: SPACE.sm,
    marginBottom: SPACE.md,
    paddingVertical: CHECKLIST.padding,
    borderRadius: CHECKLIST.radius,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.card,
    shadowColor: FIXED.shadow,
    ...SHADOW.checklist,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: CHECKLIST.padding },
  ring: {
    width: CHECKLIST.ring,
    height: CHECKLIST.ring,
    borderRadius: CHECKLIST.ring / 2,
    borderWidth: CHECKLIST.ringWidth,
    borderColor: colours.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { flex: 1, gap: SPACE.xxs },
  steps: { gap: CHECKLIST.stepGap, paddingHorizontal: CHECKLIST.padding },
  step: {
    width: CHECKLIST.stepWidth,
    minHeight: CHECKLIST.stepMinHeight,
    gap: SPACE.xs,
    padding: SPACE.sm,
    borderRadius: CHECKLIST.stepRadius,
    backgroundColor: colours.bgSoft,
  },
  pressed: { opacity: PRESSED.card },
}));
