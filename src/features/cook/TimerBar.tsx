// Running timers, pinned above the step. Finished ones say so until dismissed.
import { View } from 'react-native';

import { formatCountdown, secondsLeft, type CookTimer } from '@/domain/cook/timers';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

export function TimerBar({ timers, now, onDismiss }: { timers: CookTimer[]; now: number; onDismiss: (id: string) => void }) {
  const styles = useStyles();
  // The banner only shows when the phone is locked; in the app, VoiceOver has to be told.
  const done = timers.filter((t) => secondsLeft(t, now) === 0).map((t) => `${t.label}, step ${t.stepIndex + 1}`);
  useAnnounce(done.length ? `Time’s up: ${done.join('; ')}` : undefined);
  if (timers.length === 0) return null;
  return (
    <View style={styles.bar}>
      {timers.map((t) => {
        const left = secondsLeft(t, now);
        return (
          <View
            key={t.id}
            style={[styles.timer, left === 0 && styles.done]}
            accessibilityLiveRegion={left === 0 ? 'assertive' : 'none'}
            testID={`cook-timer-${t.id}`}
          >
            <View style={{ flex: 1 }}>
              <Text variant="meta" colour={left === 0 ? 'onAccent' : 'inkMuted'}>
                Step {t.stepIndex + 1} · {t.label}
              </Text>
              <Text variant="title" colour={left === 0 ? 'onAccent' : 'ink'} style={{ fontVariant: ['tabular-nums'] }}>
                {left === 0 ? 'Time’s up' : formatCountdown(left)}
              </Text>
            </View>
            <IconButton
              icon="close"
              label={left === 0 ? 'Dismiss timer' : 'Cancel timer'}
              onPress={() => onDismiss(t.id)}
              colour={left === 0 ? 'onAccent' : 'inkMuted'}
              testID={`cook-timer-${t.id}-dismiss`}
            />
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  bar: { gap: SPACE.xs },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACE.md,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.md,
    backgroundColor: colours.bgSoft,
  },
  done: { backgroundColor: colours.accent },
}));
