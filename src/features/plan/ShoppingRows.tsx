// The list card and its rows (spec §4.13): a soft card with a line between
// rows, each row a tick box and a small remove button.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { capitalise, type ShoppingItem } from '@/domain/shopping/derive';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

export function ListCard({ title, children }: { title?: string | undefined; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: SPACE.xs }}>
      {title ? (
        <Text variant="kickerSmall" colour="accent" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type RowProps = {
  label: string;
  detail?: string | undefined;
  checked: boolean;
  first: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeLabel: string;
  testID: string;
};

export function ShoppingRow({ label, detail, checked, first, onToggle, onRemove, removeLabel, testID }: RowProps) {
  const styles = useStyles();
  return (
    <View style={[styles.row, !first && styles.divided]}>
      <View style={{ flex: 1 }}>
        <Checkbox label={label} {...(detail ? { detail } : {})} checked={checked} onToggle={onToggle} testID={testID} />
      </View>
      <IconButton icon="close" label={removeLabel} onPress={onRemove} colour="inkMuted" size={16} testID={`${testID}-remove`} />
    </View>
  );
}

export function itemLabel(item: ShoppingItem): string {
  return item.optional ? `${capitalise(item.name)} (optional)` : capitalise(item.name);
}

const useStyles = makeStyles(({ colours }) => ({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: SPACE.md, paddingRight: SPACE.xs },
  divided: { borderTopWidth: 1, borderTopColor: colours.border },
}));
