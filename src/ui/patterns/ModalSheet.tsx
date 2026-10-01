// A small bottom sheet for a quick choice on the current screen (the recipe
// page's actions, servings). It renders nothing while closed, so nothing stays
// mounted in the background (audit ARCH-1). Full tasks use route sheets instead.
// Tall content scrolls inside the sheet, which never grows past the top of the
// screen, and the whole sheet rises above the keyboard when a field is focused.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { RADIUS, SHADOW, SPACE } from '@/ui/tokens/type';

type Props = { visible: boolean; onClose: () => void; title: string; children: ReactNode; testID?: string | undefined };

export function ModalSheet({ visible, onClose, title, children, testID }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="sheet-backdrop"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACE.md), maxHeight: `${SHEET_MAX}%` }]}
          {...(testID ? { testID } : {})}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <Text variant="cardTitleMedium" align="center" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <ScrollView
            style={styles.body}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** How much of the screen a small sheet may take before its content scrolls. */
const SHEET_MAX = 88;

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
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingBottom: SPACE.xxs },
  title: { paddingBottom: SPACE.sm, borderBottomWidth: 1, borderBottomColor: colours.border, marginBottom: SPACE.xs },
}));
