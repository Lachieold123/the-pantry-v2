// One step in big type: the quiet italic numeral, "STEP", then the words, with
// every time in them as a chip (v1 StepText.tsx). Tapping a chip starts a timer;
// while it runs the chip counts down in place, and the bar above keeps it too.
import { View } from 'react-native';

import { splitStepTimers } from '@/domain/cook/cook';
import { formatCountdown, secondsLeft, type CookTimer } from '@/domain/cook/timers';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { COOK } from '@/ui/tokens/cook';
import { useTimerClock } from './useTimerClock';

type Props = {
  text: string;
  step: number;
  timers: readonly CookTimer[];
  onStartTimer: (label: string, seconds: number) => void;
};

export function CookStep({ text, step, timers, onStartTimer }: Props) {
  const styles = useStyles();
  // The chips count down in place, so this ticks on its own rather than re-rendering Cook Mode.
  const now = useTimerClock(timers);
  const segments = splitStepTimers(text);
  const hasTimer = segments.some((s) => s.type === 'timer');
  return (
    <View>
      <Text variant="numberStep" colour="inkSubtle" style={styles.numeral} accessibilityElementsHidden importantForAccessibility="no">
        {String(step + 1).padStart(2, '0')}
      </Text>
      <Text variant="kicker" colour="inkMuted" style={styles.kicker} accessibilityElementsHidden importantForAccessibility="no">
        Step
      </Text>
      <Text variant="cookStepText" testID="cook-step-text">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return seg.text;
          // The newest timer for this time on this step decides how its chip looks.
          const timer = timers.findLast((t) => t.stepIndex === step && t.label === seg.label);
          const left = timer ? secondsLeft(timer, now) : undefined;
          const running = left !== undefined && left > 0;
          const finished = left === 0;
          return (
            <Text
              key={i}
              variant="cookStepTimer"
              colour={running ? 'bg' : finished ? 'onAccent' : 'accentDeep'}
              style={running ? styles.running : finished ? styles.finished : styles.idle}
              // A running chip is only a readout: the bar above cancels it, and a second tap
              // would start a duplicate.
              {...(running
                ? { accessibilityLabel: `${seg.label} timer, ${formatCountdown(left)} left` }
                : {
                    accessibilityRole: 'button' as const,
                    accessibilityLabel: `Start a ${seg.label} timer`,
                    onPress: () => onStartTimer(seg.label, seg.seconds),
                  })}
            >
              {` ${running ? formatCountdown(left) : finished ? 'Done ✓' : seg.label} `}
            </Text>
          );
        })}
      </Text>
      {hasTimer ? (
        <Text variant="meta" colour="inkMuted" style={styles.hint}>
          Tap a time to start a timer.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  numeral: { marginBottom: COOK.numeralBottom },
  kicker: { marginBottom: COOK.kickerBottom },
  idle: { backgroundColor: colours.accentSoft },
  // Ink with page-colour text, so it inverts cleanly in dark mode (v1 used white on cream there).
  running: { backgroundColor: colours.ink, fontVariant: ['tabular-nums'] },
  finished: { backgroundColor: colours.accent },
  hint: { paddingTop: COOK.hintTop },
}));
