// "Stock the cupboard" (v1's category tabs and tiles, spec §7 Cupboard): tap
// through a category and toggle what you have, without typing. Tiles are the
// ingredients this cook's recipes use most in that category.
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { CUPBOARD_CATEGORIES, type CupboardCategory } from '@/domain/cupboard/kitchen';
import { ingredientName, usePopularIngredients } from '@/store/cookable';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Chip } from '@/ui/primitives/Chip';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { capitalise, CATEGORY_LABEL } from './CupboardParts';

const PER_CATEGORY = 15;

type Props = { have: ReadonlySet<string>; onAdd: (id: string) => void; onRemove: (id: string) => void };

export function StockGrid({ have, onAdd, onRemove }: Props) {
  const styles = useStyles();
  const popular = usePopularIngredients();
  const [category, setCategory] = useState<CupboardCategory>('vegetables');
  const tiles = popular.filter((id) => KITCHEN.category(id) === category).slice(0, PER_CATEGORY);
  return (
    <View>
      <SectionHeader kicker="Stock the cupboard" title="Tap what you have" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsRow}>
        {CUPBOARD_CATEGORIES.filter((c) => c !== 'other').map((c) => (
          <Chip
            key={c}
            kind="quick"
            role="radio"
            label={CATEGORY_LABEL[c]}
            selected={c === category}
            onPress={() => setCategory(c)}
            testID={`stock-tab-${c}`}
          />
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {tiles.map((id) => {
          const on = have.has(id);
          return (
            <Pressable
              key={id}
              onPress={() => (on ? onRemove(id) : onAdd(id))}
              accessibilityRole="checkbox"
              aria-checked={on}
              accessibilityLabel={capitalise(ingredientName(id))}
              testID={`stock-${id}`}
              style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && styles.pressed]}
            >
              <Icon name={on ? 'check' : 'add'} size={14} colour={on ? 'bg' : 'inkMuted'} />
              <Text variant="bodySmall" colour={on ? 'bg' : 'ink'} numberOfLines={2} align="center">
                {capitalise(ingredientName(id))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  tabs: { marginHorizontal: -SPACE.gutter, marginBottom: SPACE.sm },
  tabsRow: { gap: SPACE.xs, paddingHorizontal: SPACE.gutter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  tile: {
    width: '31.5%',
    minHeight: TAP_TARGET * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xxs,
    padding: SPACE.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bg,
  },
  tileOn: { backgroundColor: colours.ink, borderColor: colours.ink },
  pressed: { opacity: 0.7 },
}));
