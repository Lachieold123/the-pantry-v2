// A small bottom sheet for a quick choice on the current screen (the recipe
// page's actions, servings). It renders nothing while closed, so nothing stays
// mounted in the background (audit ARCH-1). Full tasks use route sheets instead.
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { RADIUS, SHADOW, SPACE } from '@/ui/tokens/type';

type Props = { visible: boolean; onClose: () => void; title: string; children: ReactNode; testID?: string | undefined };

export function ModalSheet({ visible, onClose, title, children, testID }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Reduce Motion asks for fades, not slides (audit F108).
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      {/* Modal as a whole, backdrop included, so VoiceOver can reach "Close" and the scrub gesture closes it (audit F104). */}
      <View style={styles.wrap} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="sheet-backdrop"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACE.md) }]} {...(testID ? { testID } : {})}>
          <View style={styles.handle} />
          <Text variant="cardTitleMedium" align="center" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: FIXED.scrim },
  sheet: {
    backgroundColor: colours.bg,
    borderTopLeftRadius: RADIUS.big,
    borderTopRightRadius: RADIUS.big,
    paddingTop: SPACE.xs,
    paddingHorizontal: SPACE.md,
    shadowColor: FIXED.shadow,
    ...SHADOW.sheet,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colours.inkSubtle, marginBottom: SPACE.sm },
  title: { paddingBottom: SPACE.sm, borderBottomWidth: 1, borderBottomColor: colours.border, marginBottom: SPACE.xs },
}));
