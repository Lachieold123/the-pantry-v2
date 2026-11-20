// One recipe another cook has published: who made it, the photo with its
// credit, the dish and their caption. The cook's row opens their profile;
// the rest of the card opens the recipe.
import { Pressable, View } from 'react-native';

import type { FeedItem } from '@/domain/published/published';
import { photoUrl } from '@/lib/published';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Avatar } from '@/ui/primitives/Avatar';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FEED } from '@/ui/tokens/screens';
import { CARD, PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = {
  item: FeedItem;
  onOpen: (id: string) => void;
  /** Left out on the cook's own profile, where their row would only lead back. */
  onCook?: ((cookId: string) => void) | undefined;
};

export function PublishedCard({ item, onOpen, onCook }: Props) {
  const styles = useStyles();
  const { cook } = item;
  const who = (
    <>
      <Avatar name={cook.displayName} size={FEED.avatar} uri={photoUrl('avatars', cook.avatarPath)} />
      <View style={{ flex: 1 }}>
        <Text variant="name" numberOfLines={1}>
          {cook.displayName}
        </Text>
        <Text variant="metaSmall" numberOfLines={1}>
          @{cook.handle}
        </Text>
      </View>
    </>
  );
  return (
    <View style={styles.card} testID={`published-${item.id}`}>
      {onCook ? (
        <Pressable
          onPress={() => onCook(cook.id)}
          accessibilityRole="button"
          accessibilityLabel={`${cook.displayName}, @${cook.handle}. Open their profile`}
          style={({ pressed }) => [styles.who, pressed && { opacity: PRESSED.row }]}
          testID={`published-cook-${item.id}`}
        >
          {who}
        </Pressable>
      ) : (
        <View style={styles.who}>{who}</View>
      )}
      <Pressable
        onPress={() => onOpen(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, by ${cook.displayName}. Open the recipe`}
        style={({ pressed }) => pressed && { opacity: PRESSED.card }}
        testID={`published-open-${item.id}`}
      >
        <RecipeImage source={photoSource(item)} shape="card" cuisine={item.cuisine} radius={0} />
        <View style={styles.body}>
          {item.photoCredit ? (
            <Text variant="metaSmall" numberOfLines={1} testID={`published-credit-${item.id}`}>
              {item.photoCredit}
            </Text>
          ) : null}
          <Text variant="cardTitle">{item.title}</Text>
          {item.caption ? (
            <Text variant="bodySmall" colour="inkSoft" numberOfLines={FEED.captionLines}>
              {item.caption}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function photoSource(item: FeedItem): { uri: string } | undefined {
  const uri = photoUrl('recipe-photos', item.photoPath);
  return uri ? { uri } : undefined;
}

const useStyles = makeStyles(({ colours }) => ({
  card: { borderRadius: RADIUS.card, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.card, overflow: 'hidden' },
  who: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: CARD.bodyX, minHeight: TAP_TARGET + SPACE.xs },
  body: { paddingHorizontal: CARD.bodyX, paddingTop: CARD.bodyTop, paddingBottom: CARD.bodyBottom, gap: SPACE.xxs },
}));
