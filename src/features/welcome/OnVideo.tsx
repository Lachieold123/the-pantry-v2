// The welcome flow's own look (v1's OnboardingModal): white type and frosted
// "glass" controls over a dark food photo, the same in light and dark mode.
// v1 played a looping video here. Video needs a new native module, which is
// Lachlan's call (CLAUDE.md), so this uses a still from that video instead.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View, type Text as RNText } from 'react-native';

// A bundled image: a static import, so the structure rules can see it (Metro bundles it either way).
import PHOTO from '../../../assets/brand/welcome.jpg';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME, WELCOME_SCRIMS } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, TAP_TARGET } from '@/ui/tokens/type';

/** The photo and its scrim. The hello step keeps the food bright; questions darken it so the controls read. */
export function Backdrop({ scrim }: { scrim: 'hello' | keyof typeof WELCOME_SCRIMS }) {
  const g = scrim === 'hello' ? null : WELCOME_SCRIMS[scrim];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <StatusBar style="light" />
      <Image source={PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
      {g ? (
        <LinearGradient colors={g.colors} locations={g.locations} style={StyleSheet.absoluteFill} />
      ) : (
        <>
          <PhotoScrim kind="heroBottom" />
          <View style={helloTop}>
            <PhotoScrim kind="photoTop" />
          </View>
        </>
      )}
    </View>
  );
}
const helloTop = { position: 'absolute' as const, top: 0, left: 0, right: 0, height: WELCOME.topScrim };

type PressProps = { label: string; onPress: () => void; testID: string; disabled?: boolean; accessibilityHint?: string };

/** v1's white pill with an arrow: the one main action on each step. */
export function WhitePill({ label, onPress, testID, disabled = false, arrow = true }: PressProps & { arrow?: boolean }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [styles.pill, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text variant="labelOnVideo" tone={FIXED.videoInk}>
        {label}
      </Text>
      {arrow ? (
        <Text variant="labelOnVideo" tone={FIXED.videoInk} importantForAccessibility="no" accessibilityElementsHidden>
          →
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A quiet text button (Back, Not now). */
export function TextButton({ label, onPress, testID, accessibilityHint }: PressProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
    >
      <Text variant="chipLarge" tone={FIXED.onPhotoFaint}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A frosted choice: a pill chip (avoid, cuisines) or a tile with a line under the label (diet, time). */
export function GlassChoice(props: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  radio?: boolean;
}) {
  const { label, sub, selected, onPress, testID, radio = false } = props;
  const styles = useStyles();
  const tile = sub !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      testID={testID}
      style={({ pressed }) => [tile ? styles.tile : styles.chip, selected && styles.on, pressed && styles.pressed]}
    >
      <Text variant={tile ? 'tileLabel' : 'chipLarge'} tone={selected ? FIXED.videoInk : FIXED.onPhoto}>
        {label}
      </Text>
      {sub ? (
        <Text variant="value" tone={selected ? FIXED.videoInk : FIXED.videoSub}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Kicker, serif title and an optional line under it, as each v1 question opens. Without a title it starts a second section. */
/** `titleRef` lets the Welcome screen move VoiceOver to a new question (audit F101). */
export function StepHeading({
  kicker,
  title,
  sub,
  titleRef,
}: {
  kicker: string;
  title?: string;
  sub?: string;
  titleRef?: Ref<RNText> | undefined;
}) {
  const styles = useStyles();
  return (
    <View style={title ? null : styles.sectionTop}>
      <Text variant="kicker" tone={FIXED.onPhotoMuted} style={styles.kicker} {...(title ? {} : { accessibilityRole: 'header' as const })}>
        {kicker}
      </Text>
      {title ? (
        <Text
          variant="titleOnboarding"
          tone={FIXED.onPhoto}
          accessibilityRole="header"
          style={styles.title}
          {...(titleRef ? { ref: titleRef } : {})}
        >
          {title}
        </Text>
      ) : null}
      {sub ? (
        <Text variant="lead" tone={FIXED.videoSoft} style={styles.sub}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function Wrap({ children, tiles = false }: { children: ReactNode; tiles?: boolean }) {
  const styles = useStyles();
  return <View style={tiles ? styles.tiles : styles.wrap}>{children}</View>;
}

const useStyles = makeStyles(() => ({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: WELCOME.pillGap,
    minHeight: TAP_TARGET,
    paddingVertical: WELCOME.pillPadY,
    paddingHorizontal: WELCOME.pillPadX,
    borderRadius: RADIUS.pill,
    backgroundColor: FIXED.onPhoto,
  },
  textButton: {
    minWidth: WELCOME.backMin,
    minHeight: TAP_TARGET,
    padding: WELCOME.backPad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: WELCOME.disabled },
  pressed: { opacity: PRESSED.subtle },
  tile: {
    paddingVertical: WELCOME.tilePadY,
    paddingHorizontal: WELCOME.tilePadX,
    borderRadius: RADIUS.big,
    borderWidth: 1,
    borderColor: FIXED.glassBorder,
    backgroundColor: FIXED.glassTile,
  },
  chip: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingVertical: WELCOME.chipPadY,
    paddingHorizontal: WELCOME.chipPadX,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: FIXED.glassPill,
    backgroundColor: FIXED.glassChip,
  },
  on: { backgroundColor: FIXED.onPhoto, borderColor: FIXED.onPhoto },
  sectionTop: { marginTop: WELCOME.sectionTop },
  kicker: { marginBottom: WELCOME.kickerGap },
  title: { marginBottom: WELCOME.titleGap },
  sub: { marginBottom: WELCOME.titleGap },
  tiles: { gap: WELCOME.tileGap },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: WELCOME.chipGap },
}));
