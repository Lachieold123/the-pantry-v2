// The library's four tabs, across the top under its head. Text with an
// underline, like the Cupboard's stock-up tabs, rather than a pill track: four
// labels are too long for equal pills on a small phone, and this row scrolls
// sideways if large text makes them wider than the screen.
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { LIBRARY } from '@/ui/tokens/library';
import { SPACE } from '@/ui/tokens/type';

export const LIBRARY_TABS = ['cookmarks', 'collections', 'mine', 'recent'] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];

const LABEL: Record<LibraryTab, string> = {
  cookmarks: 'Cookmarks',
  collections: 'Collections',
  mine: 'My recipes',
  recent: 'Recent',
};

/** The tab a link asks for (`/library?tab=recent`). Anything else opens Cookmarks, the library's front page. */
export function tabFromLink(param: string | string[] | undefined): LibraryTab {
  const value = Array.isArray(param) ? param[0] : param;
  return LIBRARY_TABS.find((t) => t === value) ?? 'cookmarks';
}

type Props = {
  value: LibraryTab;
  onChange: (tab: LibraryTab) => void;
};

export function LibraryTabs({ value, onChange }: Props) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Library"
    >
      {LIBRARY_TABS.map((t) => {
        const selected = t === value;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="tab"
            aria-selected={selected}
            testID={`library-tab-${t}`}
            hitSlop={{ top: SPACE.xxs, bottom: SPACE.xxs }}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text variant="cupboardTab" colour={selected ? 'ink' : 'inkMuted'}>
              {LABEL[t]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  // Full bleed, so the hairline runs edge to edge under the tabs.
  strip: {
    flexGrow: 0,
    marginHorizontal: -SPACE.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.border,
  },
  row: { gap: LIBRARY.tabGap, paddingHorizontal: SPACE.gutter },
  // The underline sits on the hairline: transparent until chosen, so choosing doesn't shift the text.
  tab: {
    paddingTop: LIBRARY.tabPadTop,
    paddingBottom: LIBRARY.tabPadBottom,
    borderBottomWidth: LIBRARY.tabUnderline,
    borderBottomColor: 'transparent',
  },
  selected: { borderBottomColor: colours.accent },
}));
