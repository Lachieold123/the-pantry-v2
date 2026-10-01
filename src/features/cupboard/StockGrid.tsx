// "Stock the cupboard" (v1's category tabs and tiles, spec §4.9, §7 Cupboard):
// tap through a category and toggle what you have, without typing. Tiles are
// the ingredients this cook's recipes use most in that category. A tile you
// have takes its category's tint rather than going solid black, so the grid
// reads as the same jars as "Your cupboard" above it.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { KITCHEN } from '@/data/catalogue/catalogue';
import { CUPBOARD_CATEGORIES, type CupboardCategory } from '@/domain/cupboard/kitchen';
import { ingredientName, usePopularIngredients } from '@/store/cookable';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { CUPBOARD } from '@/ui/tokens/cupboard';
import { PANTRY_CATEGORY, PANTRY_CATEGORY_DARK, PANTRY_CHIP_INK, PANTRY_CHIP_INK_DARK } from '@/ui/tokens/cuisine';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';
import { capitalise, CATEGORY_LABEL } from './CupboardParts';

const PER_CATEGORY = 15;
const TABS = CUPBOARD_CATEGORIES.filter((c) => c !== 'other');

type Props = { have: ReadonlySet<string>; onAdd: (id: string) => void; onRemove: (id: string) => void };

export function StockGrid({ have, onAdd, onRemove }: Props) {
  const styles = useStyles();
  const dark = useTheme().name === 'dark';
  const palette = dark ? PANTRY_CATEGORY_DARK : PANTRY_CATEGORY;
  const chipInk = dark ? PANTRY_CHIP_INK_DARK : PANTRY_CHIP_INK;
  const popular = usePopularIngredients();
  const [category, setCategory] = useState<CupboardCategory>('vegetables');
  const tiles = popular.filter((id) => KITCHEN.category(id) === category).slice(0, PER_CATEGORY);
  const c = palette[category];
  return (
    <View>
      <SectionHeader kicker="Stock the cupboard" title="Tap what you have" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsRow}
        accessibilityRole="tablist"
      >
        {TABS.map((t) => {
          const active = t === category;
          return (
            <Pressable
              key={t}
              onPress={() => setCategory(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`stock-tab-${t}`}
              hitSlop={{ top: SPACE.xxs, bottom: SPACE.xxs }}
              style={[styles.tab, active && { borderBottomColor: palette[t].soft }]}
            >
              <Text variant="cupboardTab" colour={active ? 'ink' : 'inkMuted'}>
                {CATEGORY_LABEL[t]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.grid}>
        {tiles.map((id) => {
          const on = have.has(id);
          const name = capitalise(ingredientName(id));
          return (
            <Pressable
              key={id}
              onPress={() => (on ? onRemove(id) : onAdd(id))}
              accessibilityRole="checkbox"
              aria-checked={on}
              accessibilityLabel={on ? `${name}, in your cupboard` : name}
              testID={`stock-${id}`}
              style={({ pressed }) => [styles.tile, on && { backgroundColor: c.tint, borderColor: c.soft }, pressed && styles.pressed]}
            >
              <Text variant="cupboardTileInitial" colour="inkSubtle" tone={on ? c.bold : undefined} maxFontSizeMultiplier={1.3}>
                {name.charAt(0)}
              </Text>
              <Text
                variant={on ? 'cupboardTileNameOn' : 'cupboardTileName'}
                colour="inkSoft"
                tone={on ? chipInk : undefined}
                numberOfLines={1}
                align="center"
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  // Full-bleed strip so the hairline runs edge to edge, as v1's does.
  tabs: {
    marginHorizontal: -SPACE.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.border,
  },
  tabsRow: { gap: CUPBOARD.tabGap, paddingHorizontal: SPACE.gutter },
  // The underline sits on the strip's hairline: transparent until chosen.
  tab: {
    paddingTop: CUPBOARD.tabPadTop,
    paddingBottom: CUPBOARD.tabPadBottom,
    borderBottomWidth: CUPBOARD.tabUnderline,
    borderBottomColor: 'transparent',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CUPBOARD.tileGap, paddingTop: CUPBOARD.gridTop },
  tile: {
    width: CUPBOARD.tileWidth,
    minHeight: CUPBOARD.tileMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: CUPBOARD.tileGap,
    paddingVertical: CUPBOARD.tilePadY,
    paddingHorizontal: CUPBOARD.tilePadX,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
  pressed: { opacity: PRESSED.subtle },
}));
