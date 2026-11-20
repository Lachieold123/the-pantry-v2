// "From bbcgoodfood.com" under an imported recipe (K-13): the same small,
// centred line as a house recipe's photo credit, and it opens the original.
import { Linking, Pressable, StyleSheet } from 'react-native';

import type { SourceLink } from '@/domain/recipes/importLink';
import { Text } from '@/ui/primitives/Text';
import { slopFor, TYPE } from '@/ui/tokens/type';

export function SourceCredit({ link }: { link: SourceLink }) {
  return (
    <Pressable
      // A link that won't open (no browser, blocked) shouldn't throw; the line just does nothing.
      onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel={`From ${link.host}`}
      accessibilityHint="Opens the original recipe in your browser"
      // The line is small; the slop brings the press area up to a full tap target.
      hitSlop={slopFor(TYPE.metaSmall.lineHeight ?? TYPE.metaSmall.size)}
      style={styles.link}
      testID="recipe-source-credit"
    >
      <Text variant="metaSmall" align="center" style={styles.underline}>
        {`From ${link.host}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center' },
  underline: { textDecorationLine: 'underline' },
});
