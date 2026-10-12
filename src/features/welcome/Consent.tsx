// v1's terms tick on the opening screen (spec §4.21): a white-edged box and
// "I agree to the Terms of use and Privacy policy", each name a link. It only
// appears once those pages are published (lib/legal), so nobody is asked to
// agree to something they can't read; v1's "I'm 13+" is left out because the
// draft terms set no age (docs/reports/cloud-04-p7.md).
import { Fragment } from 'react';
import { Linking, Pressable, View } from 'react-native';

import type { LegalLink } from '@/lib/legal';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { WELCOME } from '@/ui/tokens/screens';
import { ICON, RADIUS, TAP_TARGET } from '@/ui/tokens/type';

export type ConsentProps = {
  /** The published pages the cook is agreeing to, from agreementLinks(). Never empty. */
  links: readonly LegalLink[];
  ticked: boolean;
  onToggle: () => void;
};

export function ConsentRow({ links, ticked, onToggle }: ConsentProps) {
  const styles = useStyles();
  const named = links.map((l) => l.label.charAt(0).toUpperCase() + l.label.slice(1));
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ticked }}
        accessibilityLabel={`I agree to the ${named.join(' and ')}`}
        testID="welcome-consent"
        hitSlop={(TAP_TARGET - WELCOME.checkbox) / 2}
        style={[styles.box, ticked && styles.boxOn]}
      >
        {ticked ? <Icon name="check" size={ICON.chip} tone={FIXED.videoInk} /> : null}
      </Pressable>
      <Text variant="caption" tone={FIXED.onPhotoMuted} style={styles.label}>
        {'I agree to the '}
        {links.map((l, i) => (
          <Fragment key={l.url}>
            {i > 0 ? ' and ' : ''}
            <Text
              variant="caption"
              tone={FIXED.onPhoto}
              style={styles.link}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(l.url)}
              testID={`welcome-legal-${i}`}
            >
              {named[i]}
            </Text>
          </Fragment>
        ))}
        .
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WELCOME.consentGap,
    paddingVertical: WELCOME.consentPadY,
    paddingHorizontal: WELCOME.consentPadX,
  },
  box: {
    width: WELCOME.checkbox,
    height: WELCOME.checkbox,
    borderRadius: RADIUS.xs,
    borderWidth: WELCOME.checkboxBorder,
    borderColor: FIXED.onPhotoFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: FIXED.onPhoto, borderColor: FIXED.onPhoto },
  label: { flex: 1 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
}));
