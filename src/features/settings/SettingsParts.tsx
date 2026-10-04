// The pieces v1's Settings is built from (SettingsModal.tsx): a small grey
// label over a white card, rows split by hairlines, and full-width card buttons.
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Divider } from '@/ui/primitives/Divider';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { Toggle } from '@/ui/primitives/Toggle';
import { makeStyles } from '@/ui/theme/makeStyles';
import { SETTINGS } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

/** A labelled white card. Hairlines go between rows, never after the last, so callers don't track "last". */
export function SettingsSection({ label, children, testID }: { label: string; children: ReactNode; testID?: string }) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View {...(testID ? { testID } : {})}>
      <Text variant="kickerList" style={styles.label} accessibilityRole="header">
        {label}
      </Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <Divider /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** v1's switch row: icon, 14pt label, a light helper line, then the platform switch. */
export function SwitchRow({
  icon,
  label,
  detail,
  value,
  onChange,
  testID,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  const styles = useStyles();
  // The whole row is the switch, as in iOS Settings: only the 31pt switch was tappable
  // before (health check #12). The switch inside is drawn for show and hidden from
  // VoiceOver, so the row is read once: "High contrast, switch, off".
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      testID={testID}
      style={({ pressed }) => [styles.iconRow, styles.rowPad, pressed && { opacity: PRESSED.row }]}
    >
      <Icon name={icon} size={SETTINGS.icon} />
      <View style={styles.text}>
        <Text variant="rowSmall">{label}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Toggle value={value} onChange={onChange} label={label} testID={`${testID}-switch`} />
      </View>
    </Pressable>
  );
}

/** A setting chosen from a short track (theme, units): its name, then the choices, then a helper line. */
export function ChoiceRow({ icon, label, helper, children }: { icon: IconName; label: string; helper?: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View>
      <View style={[styles.iconRow, styles.rowPad]}>
        <Icon name={icon} size={SETTINGS.icon} />
        <Text variant="rowSmall">{label}</Text>
      </View>
      {children}
      {helper ? (
        <Text variant="caption" style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

/** A row that only shows a fact (the version): no chevron, because it goes nowhere. */
export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.iconRow, styles.rowPad]} accessible accessibilityLabel={`${label}, ${value}`}>
      <Icon name={icon} size={SETTINGS.icon} />
      <Text variant="rowSmall" style={styles.fill}>
        {label}
      </Text>
      <Text variant="value" colour="inkMuted">
        {value}
      </Text>
    </View>
  );
}

/** v1's full-width white button under the sections ("Redo welcome flow"). */
export function CardButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID: string }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.card, styles.button, pressed && styles.pressed]}
    >
      <Icon name={icon} size={SETTINGS.buttonIcon} />
      <Text variant="rowSmall">{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  label: { marginBottom: SETTINGS.labelGap, paddingHorizontal: SETTINGS.labelInset },
  // Cards fill with the page colour, not `card`: in dark mode `card` equals the grey page and the groups would vanish.
  card: { backgroundColor: colours.bg, borderRadius: RADIUS.big, paddingHorizontal: SETTINGS.cardPadX },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  rowPad: { minHeight: TAP_TARGET, paddingVertical: SETTINGS.buttonPadY },
  fill: { flex: 1 },
  text: { flex: 1, gap: SPACE.xxs / 2 },
  helper: { paddingHorizontal: SETTINGS.labelInset, paddingTop: SETTINGS.helperTop, paddingBottom: SETTINGS.helperBottom },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    minHeight: TAP_TARGET,
    paddingVertical: SETTINGS.buttonPadY,
  },
  pressed: { opacity: PRESSED.row },
}));
