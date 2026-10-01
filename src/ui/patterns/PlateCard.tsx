// One of your plates (a dish you photographed), as v1's feed tile: a square
// photo, the dish in bold, then the time and who it fed. Used on Home, in
// the composer's preview, and nowhere it would pretend to be someone else's.
import { Pressable, View } from 'react-native';

import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { CARD, PRESSED, RADIUS } from '@/ui/tokens/type';

type Props = {
  photo: string | undefined;
  title: string;
  meta: string;
  /** Fills its column, or a fixed width in a rail. */
  width?: number | undefined;
  onPress?: (() => void) | undefined;
  testID?: string | undefined;
};

export function PlateCard({ photo, title, meta, width, onPress, testID }: Props) {
  const styles = useStyles();
  const body = (
    <>
      {/* No dish cuisine to tint by, so an empty slot takes a neutral one. */}
      <RecipeImage source={photo ? { uri: photo } : undefined} shape="square" cuisine="modern-australian" radius={0} />
      <View style={styles.body}>
        <Text variant="cardTitleSmall" numberOfLines={2}>
          {title || 'Your dish'}
        </Text>
        <Text variant="metaSmall" colour="inkSoft" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </>
  );
  const frame = [styles.card, width !== undefined ? { width } : { flex: 1 }];
  if (!onPress)
    return (
      <View style={frame} testID={testID}>
        {body}
      </View>
    );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      testID={testID}
      style={({ pressed }) => [...frame, pressed && { opacity: PRESSED.card }]}
    >
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: { borderRadius: RADIUS.card, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.card, overflow: 'hidden' },
  body: { paddingHorizontal: CARD.bodyX, paddingTop: CARD.bodyTop, paddingBottom: CARD.bodyBottom, gap: CARD.bodyTop / 2 },
}));
