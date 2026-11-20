// The photo credit under a recipe (D-045, K-17). For a Wikimedia Commons photo
// it links to the photo's file page and to its licence, and says it was
// cropped, which is what CC BY and CC BY-SA ask for. Links are real links to
// screen readers, at least 44pt tall, and open in the browser.
import { Linking, Pressable, View } from 'react-native';

import { photoCredit } from '@/domain/recipes/photoCredit';
import { useToast } from '@/ui/patterns/Toast';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRESSED, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = {
  credit: string;
  /** The photo's Wikimedia Commons file page, when it has one. */
  page: string | undefined;
};

type CreditLink = { id: string; label: string; spoken: string; url: string };

export function PhotoCredit({ credit, page }: Props) {
  const styles = useStyles();
  const toast = useToast();
  const c = photoCredit(credit, page);
  const links: CreditLink[] = [
    ...(c.page ? [{ id: 'page', label: 'Photo page', spoken: 'Photo page on Wikimedia Commons', url: c.page }] : []),
    ...(c.licence?.url ? [{ id: 'licence', label: 'Licence', spoken: `Licence, ${c.licence.name}`, url: c.licence.url }] : []),
  ];
  const open = (url: string) => void Linking.openURL(url).catch(() => toast({ message: "Couldn't open the link. Try again." }));

  return (
    <>
      <Text variant="metaSmall" align="center" testID="recipe-photo-credit">
        {c.adapted ? `${c.text}, cropped` : c.text}
      </Text>
      {links.length ? (
        <View style={styles.links}>
          {links.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => open(l.url)}
              accessibilityRole="link"
              accessibilityLabel={l.spoken}
              accessibilityHint="Opens in your browser"
              testID={`recipe-photo-${l.id}`}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text variant="metaSmall" colour="accentText" style={styles.underline}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

const useStyles = makeStyles(() => ({
  links: { flexDirection: 'row', justifyContent: 'center', gap: SPACE.md },
  link: { minHeight: TAP_TARGET, paddingHorizontal: SPACE.xs, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  pressed: { opacity: PRESSED.subtle },
}));
