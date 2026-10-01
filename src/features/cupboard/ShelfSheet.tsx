// "Always in my kitchen": the spices, sauces and basics you keep, so recipes
// that only need those count as cookable. Assume a stocked shelf (the default)
// or tick exactly what you have. Persisted, unlike v1's switch.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { CUPBOARD_CATEGORIES } from '@/domain/cupboard/kitchen';
import { ingredientName } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { Chip } from '@/ui/primitives/Chip';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { capitalise } from './CupboardParts';
import { goBack } from '@/lib/navigation';

const MODES = [
  { value: 'assume', label: 'Assume stocked' },
  { value: 'mine', label: 'Only what I tick' },
] as const;

export function ShelfSheet() {
  const router = useRouter();
  const shelf = useCupboard((s) => s.shelf);
  const setShelf = useCupboard((s) => s.setShelf);
  const toggle = (id: string) =>
    setShelf({ ...shelf, ids: shelf.ids.includes(id) ? shelf.ids.filter((x) => x !== id) : [...shelf.ids, id] });
  return (
    <Sheet kicker="Cupboard" title="Always in my kitchen" onClose={() => goBack(router)}>
      <Text variant="body" colour="inkSoft">
        Salt, pepper, oil and water are always assumed. These are the other long-life things most kitchens keep. Recipes that only need
        these from the shelf count as ready, with a “check you have” note.
      </Text>
      <Segmented<'assume' | 'mine'>
        label="Shelf"
        options={MODES}
        value={shelf.mode}
        onChange={(mode) => setShelf({ ...shelf, mode })}
        size="sm"
      />
      {CUPBOARD_CATEGORIES.map((category) => {
        const ids = KITCHEN.shelfIds.filter((id) => KITCHEN.category(id) === category);
        if (ids.length === 0) return null;
        const heading = <Text variant="kickerSmall">{category === 'herbs' ? 'Herbs & spices' : capitalise(category)}</Text>;
        // Assumed: shown as a quiet list, so you can see what "stocked" means.
        if (shelf.mode === 'assume') {
          return (
            <View key={category} style={{ gap: SPACE.xxs }}>
              {heading}
              <Text variant="bodySmall" colour="inkSoft">
                {ids.map((id) => capitalise(ingredientName(id))).join(', ')}
              </Text>
            </View>
          );
        }
        return (
          <View key={category} style={{ gap: SPACE.xs }}>
            {heading}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
              {ids.map((id) => (
                <Chip
                  key={id}
                  label={capitalise(ingredientName(id))}
                  selected={shelf.ids.includes(id)}
                  onPress={() => toggle(id)}
                  testID={`shelf-${id}`}
                />
              ))}
            </View>
          </View>
        );
      })}
    </Sheet>
  );
}
