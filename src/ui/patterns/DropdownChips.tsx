// A row of dropdown chips over the page (v1's FilterDropdown row on the feed
// and the spinner's settings). Each chip shows its choice, or its name when
// it's on "Any"; tapping one opens a small sheet of options. One component
// for both places, so they look and behave the same.
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Chip } from '@/ui/primitives/Chip';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRESSED, SPACE, TAP_TARGET } from '@/ui/tokens/type';

export type DropdownOption = { value: string; label: string };
export type Dropdown = { key: string; name: string; value: string | undefined; options: readonly DropdownOption[] };

type Props = {
  dropdowns: readonly Dropdown[];
  onChoose: (key: string, value: string | undefined) => void;
  /** testIDs are `<prefix>-<key>` for chips and `<prefix>-option-<value|any>` for options. */
  testIDPrefix: string;
};

export function DropdownChips({ dropdowns, onChoose, testIDPrefix }: Props) {
  const [open, setOpen] = useState<string | undefined>();
  const picking = dropdowns.find((d) => d.key === open);
  const choose = (value: string | undefined) => {
    if (picking) onChoose(picking.key, value);
    setOpen(undefined);
  };
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACE.gutter, flexGrow: 0 }}
        contentContainerStyle={{ gap: SPACE.xs, paddingHorizontal: SPACE.gutter }}
      >
        {dropdowns.map((d) => (
          <Chip
            key={d.key}
            kind="dropdown"
            label={d.options.find((o) => o.value === d.value)?.label ?? d.name}
            selected={d.value !== undefined}
            onPress={() => setOpen(d.key)}
            testID={`${testIDPrefix}-${d.key}`}
          />
        ))}
      </ScrollView>
      <ModalSheet visible={picking !== undefined} onClose={() => setOpen(undefined)} title={picking?.name ?? ''}>
        {picking
          ? [{ value: undefined, label: 'Any' }, ...picking.options].map((o) => (
              <OptionRow
                key={o.label}
                label={o.label}
                on={picking.value === o.value}
                onPress={() => choose(o.value)}
                testID={`${testIDPrefix}-option-${o.value ?? 'any'}`}
              />
            ))
          : null}
      </ModalSheet>
    </>
  );
}

function OptionRow({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID: string }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      testID={testID}
      style={({ pressed }) => [styles.option, pressed && { opacity: PRESSED.row }]}
    >
      <Text variant="row" style={{ flex: 1 }}>
        {label}
      </Text>
      {on ? <Icon name="check" size={18} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  option: { flexDirection: 'row', alignItems: 'center', minHeight: TAP_TARGET + SPACE.xxs, paddingHorizontal: SPACE.xs },
}));
