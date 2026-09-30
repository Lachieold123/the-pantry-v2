// Running timers, pinned above the step. Finished ones say so until dismissed.
// The clock ticks here, not in Cook Mode, so only this bar re-renders each
// half second, and it stops once every timer has finished (audit F53).
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { anyRunning, formatCountdown, secondsLeft, type CookTimer } from '@/domain/cook/timers';
import { useAnnounce } from '@/ui/a11y/announce';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

const TICK_MS = 500;

export function TimerBar({ timers, onDismiss }: { timers: CookTimer[]; onDismiss: (id: string) => void }) {
  const styles = useStyles();
  const [now, setNow] = useState(() => Date.now());
  const running = anyRunning(timers, now);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    // Straight away too: a timer just added counts from the real time, not the last tick.
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [running, timers]);
  // Say each timer as it finishes: the tint alone is silent to VoiceOver (audit F97).
  const finished = timers.filter((t) => secondsLeft(t, now) === 0);
  useAnnounce(finished.length ? `Time’s up: ${finished.map((t) => t.label).join(', ')}` : null);
  if (timers.length === 0) return null;
  return (
    <View style={styles.bar}>
      {timers.map((t) => {
        const left = secondsLeft(t, now);
        return (
          <View key={t.id} style={[styles.timer, left === 0 && styles.done]} testID={`cook-timer-${t.id}`}>
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
