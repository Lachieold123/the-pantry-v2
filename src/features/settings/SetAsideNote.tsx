// Which items the server refused to back up (DATA-5, display half). Sign-out is
// refused while any are set aside, so this names them: the person can shorten
// that recipe or collection, then sign out without losing it.
import { View } from 'react-native';

import type { Row, RowKind } from '@/domain/sync/types';
import { useAccount } from '@/store/account';
import { useHousehold } from '@/store/household';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const KIND_WORDS: Record<RowKind, string> = {
  plan: 'A planned meal',
  tick: 'A shopping list tick',
  removal: 'A shopping list change',
  extra: 'A shopping list item',
  cupboard: 'A cupboard item',
  recipe: 'A shared recipe',
  bookmark: 'A Cookmark',
  collection: 'A collection',
  hidden: 'A hidden recipe',
  myrecipe: 'One of your recipes',
  recent: 'A recently viewed recipe',
  cooklog: 'A cooked dish',
  prefs: 'Your settings',
};

/** One line per set-aside item: its name when it has one ("Nan’s lasagne"), else what kind of thing it is. */
export function setAsideNames(rows: readonly Row[]): string[] {
  return rows.map((row) => {
    const data = (row.data ?? {}) as { title?: unknown; name?: unknown };
    const name = typeof data.title === 'string' ? data.title : typeof data.name === 'string' ? data.name : undefined;
    return name ? `${KIND_WORDS[row.kind]}: “${name}”` : KIND_WORDS[row.kind];
  });
}

export function SetAsideNote() {
  const mine = useAccount((s) => s.setAside);
  const shared = useHousehold((s) => s.setAside);
  const names = setAsideNames([...Object.values(mine ?? {}), ...Object.values(shared ?? {})]);
  if (!names.length) return null;
  return (
    <View style={{ gap: SPACE.xxs }} accessible testID="settings-set-aside">
      <Text variant="bodySmall" colour="danger">
        {names.length === 1 ? 'This is too big to back up. Shorten it to keep it safe:' : 'These are too big to back up. Shorten them to keep them safe:'}
      </Text>
      {names.map((n, i) => (
        <Text key={i} variant="bodySmall" colour="inkSoft">
          {`• ${n}`}
        </Text>
      ))}
    </View>
  );
}
