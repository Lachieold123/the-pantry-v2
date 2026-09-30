// v1's collection card (spec §4.6, CollectionsModal): a square 2×2 mosaic of
// the first four recipes' photos on a dark well, then the name and a count.
// Empty cells stay dark, as in v1 (`light-18`). Long-press opens the
// collection's actions. CollectionMosaicGrid lays them two to a row.
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { LIBRARY, libraryColours } from '@/ui/tokens/library';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';

export type MosaicItem = {
  id: string;
  name: string;
  count: number;
  /** Up to four photos; missing ones show as dark cells. */
  photos: readonly (number | undefined)[];
};

type CardProps = { item: MosaicItem; onPress: () => void; onLongPress: () => void };

const CELLS = [0, 1, 2, 3] as const;

export function CollectionMosaic({ item, onPress, onLongPress }: CardProps) {
  const styles = useStyles();
  const countLabel = item.count === 1 ? '1 recipe' : `${item.count} recipes`;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      testID={`collection-card-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${countLabel}`}
      accessibilityHint="Opens the collection. Long press to rename or delete it."
      accessibilityActions={[{ name: 'longpress', label: 'Rename or delete' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'longpress' ? onLongPress() : undefined)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={styles.mosaic}>
        {CELLS.map((i) => {
          const photo = item.photos[i];
          return (
            <View key={i} style={styles.cell}>
              {photo === undefined ? null : <Image source={photo} style={styles.photo} contentFit="cover" accessible={false} />}
            </View>
          );
        })}
      </View>
      <View style={styles.body}>
        <Text variant="cardTitleMedium" numberOfLines={2}>
          {item.name}
        </Text>
        <Text variant="chipSmall" colour="inkMuted">
          {countLabel}
        </Text>
      </View>
    </Pressable>
  );
}

type GridProps = { items: readonly MosaicItem[]; onOpen: (id: string) => void; onActions: (id: string) => void };

export function CollectionMosaicGrid({ items, onOpen, onActions }: GridProps) {
  const styles = useStyles();
  const rows: MosaicItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((r) => r.id).join()} style={styles.row}>
          {row.map((item) => (
            <View key={item.id} style={styles.slot}>
              <CollectionMosaic item={item} onPress={() => onOpen(item.id)} onLongPress={() => onActions(item.id)} />
            </View>
          ))}
          {row.length === 1 ? <View style={styles.slot} /> : null}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ name }) => {
  const c = libraryColours(name);
  return {
    grid: { gap: LIBRARY.mosaicRowGap, marginHorizontal: LIBRARY.gridX - SPACE.gutter },
    row: { flexDirection: 'row', gap: LIBRARY.gridGap },
    slot: { flex: 1 },
    pressed: { opacity: PRESSED.card },
    mosaic: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: RADIUS.xl,
      overflow: 'hidden',
      backgroundColor: c.well,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: { width: '50%', height: '50%', padding: LIBRARY.mosaicGutter },
    photo: { width: '100%', height: '100%' },
    body: { paddingTop: LIBRARY.mosaicBodyTop, paddingHorizontal: LIBRARY.mosaicBodyX, gap: LIBRARY.mosaicGutter * 2 },
  };
});
