// The two page shapes of the welcome flow (spec §4.21): the hello page, with
// its content at the foot of the photo, and the question page, with a progress
// bar and Skip on top, a scrolling body and Back / Continue at the foot, with
// an optional live line (the cupboard count) just above them.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, TAP_TARGET } from '@/ui/tokens/type';
import { Backdrop, TextButton, WhitePill } from './OnVideo';

const SKIP_HINT = 'Go straight to the app';

export function HelloStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Backdrop scrim="hello" />
      <View style={styles.topRow}>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          accessibilityHint={SKIP_HINT}
          hitSlop={10}
          testID="welcome-skip"
          style={({ pressed }) => [styles.skipPill, pressed && styles.pressed]}
        >
          <Text variant="pillLabel" tone={FIXED.onPhoto}>
            Skip
          </Text>
        </Pressable>
      </View>
      <View style={styles.titleBlock}>
        <Text variant="kickerWide" tone={FIXED.videoKicker} style={styles.brand}>
          The Pantry
        </Text>
        <Text variant="displayWelcome" tone={FIXED.onPhoto} accessibilityRole="header" style={styles.display}>
          {'Tonight’s dinner,\nsorted.'}
        </Text>
        <Text variant="leadLarge" tone={FIXED.onPhotoMuted} style={styles.subtitle}>
          Cook from what you already have, plan the week and shop once. Two quick steps and we’ll show what you can make tonight.
        </Text>
      </View>
      <View style={styles.helloFooter}>
        <WhitePill label="Get started" onPress={onStart} testID="welcome-start" />
      </View>
    </View>
  );
}

type QuizProps = {
  /** How far through, 0 to 1. */
  progress: number;
  onSkip: () => void;
  footer: ReactNode;
  /** A short line above the footer that changes as you tap, read out by screen readers. */
  note?: string | undefined;
  children: ReactNode;
};

export function QuizFrame({ progress, onSkip, footer, note, children }: QuizProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Backdrop scrim="quiz" />
      <View style={styles.bar}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <TextButton label="Skip" onPress={onSkip} testID="welcome-skip" accessibilityHint={SKIP_HINT} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {note !== undefined ? (
        <Text
          variant="pillLabel"
          tone={FIXED.onPhotoMuted}
          align="center"
          accessibilityLiveRegion="polite"
          style={styles.note}
          testID="welcome-note"
        >
          {note}
        </Text>
      ) : null}
      <View style={[styles.footer, note !== undefined && styles.footerUnderNote]}>{footer}</View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  page: { flex: 1, backgroundColor: FIXED.videoBg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: WELCOME.topPadX, paddingTop: WELCOME.topPadY },
  skipPill: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingVertical: WELCOME.skipPadY,
    paddingHorizontal: WELCOME.skipPadX,
    borderRadius: RADIUS.pill,
    backgroundColor: FIXED.glassPill,
  },
  pressed: { opacity: PRESSED.subtle },
  titleBlock: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: WELCOME.padX, paddingBottom: WELCOME.titleBottom },
  brand: { marginBottom: WELCOME.kickerBottom },
  display: { marginBottom: WELCOME.displayBottom },
  subtitle: { maxWidth: WELCOME.subtitleMax },
  helloFooter: { flexDirection: 'row', paddingHorizontal: WELCOME.padX, paddingBottom: WELCOME.footerBottom },
  bar: { flexDirection: 'row', alignItems: 'center', gap: WELCOME.barGap, paddingLeft: WELCOME.topPadX, paddingVertical: WELCOME.barPadY },
  track: { flex: 1, height: WELCOME.progress, borderRadius: WELCOME.progress / 2, backgroundColor: FIXED.glassTrack, overflow: 'hidden' },
  fill: { height: WELCOME.progress, borderRadius: WELCOME.progress / 2, backgroundColor: FIXED.onPhoto },
  body: { flexGrow: 1, paddingHorizontal: WELCOME.padX, paddingTop: WELCOME.bodyTop, paddingBottom: WELCOME.bodyBottom },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WELCOME.barGap,
    paddingHorizontal: WELCOME.topPadX,
    paddingVertical: WELCOME.footerBottom,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FIXED.glassPill,
  },
  // With the count above it, the hairline goes above the count instead.
  note: {
    paddingTop: WELCOME.footerBottom,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FIXED.glassPill,
  },
  footerUnderNote: { borderTopWidth: 0 },
}));
