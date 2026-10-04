// The first-use tour (D-035): the real screen dims, a rounded spotlight sits on
// one control at a time, and a small card says what it's for. Four stops,
// "Skip tour" on the card at every stop but the last, shown once after the welcome and
// replayable from Settings.
// It points at real views (registered with useTourTarget), so it can't drift
// from the app the way a recorded video would.
import { useEffect, useState } from 'react';
import { Modal, View, useWindowDimensions } from 'react-native';

import { tourTarget, useTour } from '@/store/tour';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { TOUR } from '@/ui/tokens/screens';
import { RADIUS, SHADOW, SPACE } from '@/ui/tokens/type';
import { TOUR_STEPS } from './steps';

type Rect = { x: number; y: number; width: number; height: number };

/** Starts the tour once, after the welcome, when its saved state has loaded. */
export function useFirstUseTour() {
  const seen = useTour((s) => s.seen);
  const step = useTour((s) => s.step);
  const start = useTour((s) => s.start);
  const [loaded, setLoaded] = useState(() => useTour.persist.hasHydrated());
  useEffect(() => useTour.persist.onFinishHydration(() => setLoaded(true)), []);
  useEffect(() => {
    if (!loaded || seen || step !== undefined) return;
    // Give Home a moment to lay out, so the first spotlight lands on the switch.
    const t = setTimeout(start, TOUR.startDelay);
    return () => clearTimeout(t);
  }, [loaded, seen, step, start]);
}

export function TourOverlay() {
  useFirstUseTour();
  const styles = useStyles();
  const window = useWindowDimensions();
  const step = useTour((s) => s.step);
  const goTo = useTour((s) => s.goTo);
  const finish = useTour((s) => s.finish);
  // Kept with the step it was measured for, so a new step never borrows the last one's spotlight.
  const [measured, setMeasured] = useState<{ step: number; rect: Rect } | undefined>();
  const current = step === undefined ? undefined : TOUR_STEPS[step];
  const rect = measured && measured.step === step ? measured.rect : undefined;

  useEffect(() => {
    if (step === undefined || !current) return;
    // Nothing registered (a screen not built yet): the card still shows, centred, without a spotlight.
    tourTarget(current.target)?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setMeasured({ step, rect: { x, y, width, height } });
    });
  }, [step, current]);

  if (step === undefined || !current) return null;
  const last = step === TOUR_STEPS.length - 1;
  const hole = rect
    ? { x: rect.x - TOUR.pad, y: rect.y - TOUR.pad, width: rect.width + TOUR.pad * 2, height: rect.height + TOUR.pad * 2 }
    : undefined;
  // The card goes on whichever side of the spotlight has more room.
  // The shape of what it points at: a pill stays a pill, a tab gets soft tile corners.
  const radius = hole ? (current.shape === 'pill' ? hole.height / 2 : RADIUS.lg) : 0;
  // Wide enough to cover the whole screen from any spot.
  const reach = Math.max(window.width, window.height) * 2;
  const below = hole ? hole.y + hole.height / 2 < window.height / 2 : true;
  const cardPosition = hole
    ? below
      ? { top: hole.y + hole.height + SPACE.sm }
      : { bottom: window.height - hole.y + SPACE.sm }
    : { top: window.height / 3 };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish} statusBarTranslucent>
      <View style={{ flex: 1 }} accessibilityViewIsModal onAccessibilityEscape={finish} testID="tour">
        {hole ? (
          <>
            {/* One view with a very wide border: its inner edge is the hole, so the hole's corners are truly rounded. */}
            <View
              pointerEvents="none"
              style={[
                styles.mask,
                {
                  left: hole.x - reach,
                  top: hole.y - reach,
                  width: hole.width + reach * 2,
                  height: hole.height + reach * 2,
                  borderWidth: reach,
                  borderRadius: radius + reach,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[styles.ring, { top: hole.y, left: hole.x, width: hole.width, height: hole.height, borderRadius: radius }]}
            />
          </>
        ) : (
          <View style={[styles.dim, { top: 0, left: 0, right: 0, bottom: 0 }]} />
        )}
        <View style={[styles.card, cardPosition]} accessibilityLiveRegion="polite">
          <Text variant="kickerSmall" colour="accentDeep">{`${step + 1} of ${TOUR_STEPS.length}`}</Text>
          <Text variant="cardTitleLarge" accessibilityRole="header">
            {current.title}
          </Text>
          <Text variant="bodyMedium" colour="inkSoft">
            {current.body}
          </Text>
          <View style={styles.footer}>
            <View style={styles.dots} accessible={false}>
              {TOUR_STEPS.map((s, i) => (
                <View key={s.target} style={[styles.dot, i === step && styles.dotOn]} />
              ))}
            </View>
            {/* Skip lives on the card: the top-corner pill sat on the header's avatar (health check #10). */}
            {last ? null : <Button label="Skip tour" kind="quiet" onPress={finish} testID="tour-skip" />}
            <Button
              label={last ? 'Start cooking' : 'Next'}
              kind="primary"
              onPress={() => (last ? finish() : goTo(step + 1))}
              testID={last ? 'tour-done' : 'tour-next'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  dim: { position: 'absolute', backgroundColor: FIXED.scrim },
  mask: { position: 'absolute', borderColor: FIXED.scrim },
  ring: { position: 'absolute', borderWidth: TOUR.ring, borderColor: colours.accent },
  card: {
    position: 'absolute',
    left: SPACE.gutter,
    right: SPACE.gutter,
    gap: SPACE.xs,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
    backgroundColor: colours.bg,
    shadowColor: FIXED.shadow,
    ...SHADOW.sheet,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xs },
  dots: { flex: 1, flexDirection: 'row', gap: TOUR.dotGap },
  dot: { width: TOUR.dot, height: TOUR.dot, borderRadius: TOUR.dot / 2, backgroundColor: colours.border },
  dotOn: { width: TOUR.dotOn, backgroundColor: colours.accent },
}));
