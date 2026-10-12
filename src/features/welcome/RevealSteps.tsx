// The questions' payoff and the last ask, in v1's look (spec §4.21).
//
// "Tonight, for you": three real picks from the same ranking as Home, using
// everything just answered. Tap one to choose it, "Spin again" for three more,
// then "Cook this tonight" puts it on tonight's plan, or "Not tonight" moves on.
//
// The notification primer: says exactly what we'd send (the Sunday planning
// reminder, which is all the app schedules besides Cook Mode's timers) before
// iOS asks, so the system prompt only appears for someone who said yes.
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { SUNDAY_REMINDER_TEXT } from '@/lib/notifications';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME } from '@/ui/tokens/screens';
import { ICON, PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Backdrop, StepHeading, TextButton, WhitePill } from './OnVideo';

type RevealProps = {
  picks: readonly Recipe[];
  chosen: Recipe;
  canSpin: boolean;
  onChoose: (recipe: Recipe) => void;
  onSpin: () => void;
  onNotTonight: () => void;
};

export function RevealBody({ picks, chosen, canSpin, onChoose, onSpin, onNotTonight }: RevealProps) {
  const styles = useStyles();
  return (
    <View style={styles.stack}>
      <StepHeading
        kicker="Your menu’s ready"
        title={'Tonight,\nfor you'}
        sub="Picked from everything you just told us. Tap one to choose it."
      />
      {picks.map((r) => {
        const on = r.id === chosen.id;
        const ink = on ? FIXED.videoInk : FIXED.onPhoto;
        return (
          <Pressable
            key={r.id}
            onPress={() => onChoose(r)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${r.title}, ${CUISINE_LABELS[r.cuisine]}, ${formatMinutes(totalMinutes(r))}`}
            testID={`welcome-pick-${r.id}`}
            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
          >
            <View style={styles.thumb}>
              <RecipeImage source={RECIPE_IMAGES[r.id]} shape="square" cuisine={r.cuisine} radius={RADIUS.md} iconSize={SPACE.lg} />
            </View>
            <View style={styles.fill}>
              <Text variant="cardTitle" tone={ink} numberOfLines={2}>
                {r.title}
              </Text>
              <Text variant="value" tone={on ? FIXED.videoInk : FIXED.videoSub} numberOfLines={1}>
                {`${CUISINE_LABELS[r.cuisine]} · ${formatMinutes(totalMinutes(r))}`}
              </Text>
            </View>
            <Icon name={on ? 'checkCircle' : 'circle'} size={ICON.row} tone={on ? FIXED.videoInk : FIXED.onPhotoDot} />
          </Pressable>
        );
      })}
      {canSpin ? (
        <Pressable
          onPress={onSpin}
          accessibilityRole="button"
          accessibilityLabel="Spin again"
          testID="welcome-spin"
          style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
        >
          <Icon name="refresh" size={SPACE.md} tone={FIXED.onPhoto} />
          <Text variant="chipLarge" tone={FIXED.onPhoto}>
            Spin again
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.centre}>
        <TextButton label="Not tonight" onPress={onNotTonight} testID="welcome-not-tonight" />
      </View>
    </View>
  );
}

/** Every dinner ruled out: say so plainly and offer the one fix. */
export function RevealEmpty({ onChange }: { onChange: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.stack} testID="welcome-empty">
      <StepHeading
        kicker="Your menu"
        title="Nothing fits all of that yet"
        sub="Your answers rule out every dinner we have. Try loosening what you avoid."
      />
      <View style={styles.row0}>
        <WhitePill label="Change answers" onPress={onChange} testID="welcome-change-answers" />
      </View>
    </View>
  );
}

export function NotifyStep({ busy, onAllow, onLater }: { busy: boolean; onAllow: () => void; onLater: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="welcome-notify">
      <Backdrop scrim="reveal" />
      <View style={styles.notif}>
        <View style={styles.bell}>
          <Icon name="notifications" size={WELCOME.bellIcon} tone={FIXED.onPhoto} />
        </View>
        <Text variant="recipeTitle" tone={FIXED.onPhoto} align="center" accessibilityRole="header">
          {'A nudge when\nit counts'}
        </Text>
        <Text variant="body" tone={FIXED.videoSoft} align="center" style={styles.notifSub}>
          One reminder at 4pm on Sunday to plan the week, and a ping when a Cook Mode timer finishes. Nothing else. Change it any time in
          Settings.
        </Text>
        {/* The real Sunday reminder, word for word, so the preview can't promise something else. */}
        <View style={styles.preview} accessibilityLabel={`Example: ${SUNDAY_REMINDER_TEXT.title} ${SUNDAY_REMINDER_TEXT.body}`}>
          <View style={styles.previewHead}>
            <Icon name="notifications" size={ICON.standard} tone={FIXED.videoInk} />
            <Text variant="name" tone={FIXED.videoInk}>
              The Pantry
            </Text>
          </View>
          <Text variant="bodySmall" tone={FIXED.videoInk}>
            {`${SUNDAY_REMINDER_TEXT.title} ${SUNDAY_REMINDER_TEXT.body}`}
          </Text>
        </View>
      </View>
      <View style={styles.footerColumn}>
        <View style={styles.row0}>
          <WhitePill label="Allow notifications" onPress={onAllow} disabled={busy} testID="welcome-allow" />
        </View>
        <View style={styles.centre}>
          <TextButton label="Maybe later" onPress={onLater} testID="welcome-later" />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  page: { flex: 1, backgroundColor: FIXED.videoBg },
  stack: { gap: SPACE.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WELCOME.barGap,
    padding: SPACE.sm,
    borderRadius: RADIUS.big,
    borderWidth: 1,
    borderColor: FIXED.glassPill,
    backgroundColor: FIXED.glassTile,
  },
  rowOn: { backgroundColor: FIXED.onPhoto, borderColor: FIXED.onPhoto },
  thumb: { width: WELCOME.thumb, height: WELCOME.thumb },
  fill: { flex: 1, gap: SPACE.xxs },
  pressed: { opacity: PRESSED.subtle },
  outline: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TAP_TARGET,
    marginTop: SPACE.xs,
    paddingHorizontal: WELCOME.tilePadX,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: FIXED.glassOutline,
  },
  centre: { alignItems: 'center' },
  row0: { flexDirection: 'row' },
  notif: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: WELCOME.padX, gap: WELCOME.titleGap },
  bell: {
    width: WELCOME.bell,
    height: WELCOME.bell,
    borderRadius: WELCOME.bell / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
    backgroundColor: FIXED.glassChip,
  },
  notifSub: { maxWidth: WELCOME.subtitleMax },
  preview: {
    alignSelf: 'stretch',
    gap: SPACE.xxs,
    marginTop: SPACE.sm,
    padding: WELCOME.previewPad,
    borderRadius: RADIUS.lg,
    backgroundColor: FIXED.videoPreview,
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  footerColumn: { paddingHorizontal: WELCOME.padX, paddingBottom: WELCOME.footerBottom, gap: SPACE.xxs },
}));
