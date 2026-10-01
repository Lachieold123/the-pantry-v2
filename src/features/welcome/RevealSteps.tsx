// The quiz's payoff and its last ask, in v1's look: "Tonight, for you" (a
// real pick from the same scoring as the Feed) and the optional Sunday nudge.
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Backdrop, StepHeading, TextButton, WhitePill } from './OnVideo';

type RevealProps = {
  hero: Recipe;
  more: readonly Recipe[];
  canShowOthers: boolean;
  /** Tapping the photo is a look, not a decision: it opens the recipe, and only the button plans it (audit F146). */
  onOpenHero: () => void;
  onPick: (recipe: Recipe) => void;
  onShowOthers: () => void;
  onNotTonight: () => void;
};

export function RevealBody({ hero, more, canShowOthers, onOpenHero, onPick, onShowOthers, onNotTonight }: RevealProps) {
  const styles = useStyles();
  return (
    <View style={styles.stack}>
      <StepHeading kicker="Your menu’s ready" title="Tonight, for you" sub="Picked from everything you just told us." />
      <RecipeCard recipe={hero} image={RECIPE_IMAGES[hero.id]} size="large" onPress={onOpenHero} testID="welcome-pick" />
      {more.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => onPick(r)}
          accessibilityRole="button"
          accessibilityLabel={`Or ${r.title}`}
          testID={`welcome-other-${r.id}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.thumb}>
            <RecipeImage source={RECIPE_IMAGES[r.id]} shape="square" cuisine={r.cuisine} radius={RADIUS.md} iconSize={SPACE.lg} />
          </View>
          <View style={styles.fill}>
            <Text variant="cardTitle" tone={FIXED.onPhoto} numberOfLines={2}>
              {r.title}
            </Text>
            <Text variant="value" tone={FIXED.videoSub} numberOfLines={1}>
              {`Or this · ${CUISINE_LABELS[r.cuisine]} · ${formatMinutes(totalMinutes(r))}`}
            </Text>
          </View>
          <Icon name="forward" size={SPACE.gutter} tone={FIXED.onPhotoDot} />
        </Pressable>
      ))}
      {canShowOthers ? (
        <Pressable
          onPress={onShowOthers}
          accessibilityRole="button"
          accessibilityLabel="Show me others"
          testID="welcome-show-others"
          style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
        >
          <Icon name="refresh" size={SPACE.md} tone={FIXED.onPhoto} />
          <Text variant="chipLarge" tone={FIXED.onPhoto}>
            Show me others
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

export function ReminderStep({ busy, onRemind, onNotNow }: { busy: boolean; onRemind: () => void; onNotNow: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Backdrop scrim="reveal" />
      <View style={styles.notif}>
        <View style={styles.bell}>
          <Icon name="notifications" size={WELCOME.bellIcon} tone={FIXED.onPhoto} />
        </View>
        <Text variant="recipeTitle" tone={FIXED.onPhoto} align="center" accessibilityRole="header">
          A nudge on Sundays?
        </Text>
        <Text variant="body" tone={FIXED.videoSoft} align="center" style={styles.notifSub}>
          We’ll remind you at 4pm on Sunday to plan the week. Nothing else, ever. You can change it in Settings.
        </Text>
      </View>
      <View style={styles.footerColumn}>
        <View style={styles.row0}>
          <WhitePill label="Remind me on Sundays" onPress={onRemind} disabled={busy} testID="welcome-remind" />
        </View>
        <View style={styles.centre}>
          <TextButton label="Not now" onPress={onNotNow} testID="welcome-not-now" />
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
    gap: SPACE.sm,
    padding: SPACE.sm,
    borderRadius: RADIUS.big,
    borderWidth: 1,
    borderColor: FIXED.glassPill,
    backgroundColor: FIXED.glassTile,
  },
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
  footerColumn: { paddingHorizontal: WELCOME.padX, paddingBottom: WELCOME.footerBottom, gap: SPACE.xxs },
}));
