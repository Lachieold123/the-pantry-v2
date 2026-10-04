// v1's centred naming dialog (CollectionsModal): a serif title, one serif
// input, and a Cancel / Create pair. Used to create and to rename a
// collection. The caller checks the name (blank, already taken) and the
// dialog shows why it can't be saved rather than silently doing nothing.
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { textStyle } from '@/ui/theme/fonts';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FIXED } from '@/ui/tokens/colour';
import { LIBRARY } from '@/ui/tokens/library';
import { PRESSED, RADIUS, SPACE, TAP_TARGET, TYPE } from '@/ui/tokens/type';

type Props = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  initialName?: string;
  /** Why this name can't be used, or undefined when it can. Called with the trimmed name. */
  problem: (name: string) => string | undefined;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

export function CollectionNameDialog(props: Props) {
  const styles = useStyles();
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={props.onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          testID="name-dialog-backdrop"
        />
        {/* Mounted only while open, so each opening starts from the name it was given. */}
        {props.visible ? <DialogCard {...props} /> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DialogCard({ title, confirmLabel, initialName = '', problem, onSubmit, onClose }: Props) {
  const styles = useStyles();
  const { colours } = useTheme();
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  // A blank name just disables Create; only a real clash earns a message.
  const error = trimmed ? problem(trimmed) : undefined;
  const canSave = trimmed.length > 0 && error === undefined;
  const submit = () => {
    if (canSave) onSubmit(trimmed);
  };
  return (
    <View style={styles.card} accessibilityViewIsModal onAccessibilityEscape={onClose} testID="name-dialog">
      <Text variant="cardTitleLarge" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Vego, Quick dinners"
        placeholderTextColor={colours.inkMuted}
        selectionColor={colours.accent}
        accessibilityLabel="Collection name"
        autoFocus
        returnKeyType="done"
        maxLength={40}
        onSubmitEditing={submit}
        style={[styles.input, error ? styles.invalid : null]}
        testID="name-dialog-input"
      />
      {error ? (
        <Text variant="meta" colour="danger" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          testID="name-dialog-cancel"
          style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
        >
          <Text variant="label">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          testID="name-dialog-save"
          style={({ pressed }) => [styles.button, styles.save, !canSave && styles.disabled, pressed && styles.pressed]}
        >
          <Text variant="label" colour="bg">
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  backdrop: { backgroundColor: FIXED.scrim },
  card: {
    width: '100%',
    maxWidth: LIBRARY.dialogMax,
    backgroundColor: colours.bg,
    borderRadius: RADIUS.card,
    padding: LIBRARY.dialogPad,
    borderWidth: 1,
    borderColor: colours.border,
  },
  title: { marginBottom: SPACE.sm },
  input: {
    ...textStyle(TYPE.cardTitleMedium),
    // v1's serif input; a fixed line height clips typed text on iOS.
    fontWeight: '400',
    lineHeight: undefined,
    color: colours.ink,
    minHeight: TAP_TARGET,
    paddingHorizontal: LIBRARY.dialogInputX,
    paddingVertical: LIBRARY.dialogInputY,
    borderRadius: RADIUS.md,
    backgroundColor: colours.bgSoft,
    borderWidth: 1,
    borderColor: colours.border,
  },
  invalid: { borderColor: colours.danger },
  error: { marginTop: SPACE.xs },
  buttons: { flexDirection: 'row', gap: SPACE.sm - 2, marginTop: SPACE.md - 2 },
  button: { flex: 1, minHeight: TAP_TARGET, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colours.bgSoft, borderWidth: 1, borderColor: colours.border },
  save: { backgroundColor: colours.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: PRESSED.subtle },
}));
