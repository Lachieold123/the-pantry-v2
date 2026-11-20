// "Ready now" and "Nearly there" for other cooks' recipes on Home (Home's own words, UX-5): the
// published recipes your cupboard fully covers, then the ones one or two
// things short, each with what's missing. Rows, not cards, so they stay short.
import { useState } from 'react';
import { View } from 'react-native';

import type { Tiered } from '@/lib/homeFeed';
import { ingredientName } from '@/store/cookable';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FEED } from '@/ui/tokens/screens';
import { CARD, RADIUS, SPACE } from '@/ui/tokens/type';

type Props = { canCook: readonly Tiered[]; missingFew: readonly Tiered[]; onOpen: (id: string) => void };

export function HomeTiers({ canCook, missingFew, onOpen }: Props) {
  if (!canCook.length && !missingFew.length) return null;
  return (
    <View style={{ gap: SPACE.md }} testID="home-tiers">
      <Tier title="Ready now" list={canCook} onOpen={onOpen} testID="home-can-cook" />
      <Tier title="Nearly there" list={missingFew} onOpen={onOpen} testID="home-missing-few" />
    </View>
  );
}

function Tier({ title, list, onOpen, testID }: { title: string; list: readonly Tiered[]; onOpen: (id: string) => void; testID: string }) {
  const styles = useStyles();
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = list.slice(0, all ? FEED.tierMax : FEED.tierPreview);
  return (
    <View style={{ gap: SPACE.xs }} testID={testID}>
      <Text variant="meta" colour="accentText">
        {`${title} · ${list.length}`}
      </Text>
      <View style={styles.card}>
        {shown.map(({ row, missing }) => (
          <ListRow
            key={row.item.id}
            title={row.item.title}
            detail={missing.length ? `Need ${missing.map(ingredientName).join(', ')}` : `By ${row.item.cookName}`}
            onPress={() => onOpen(row.item.id)}
            testID={`${testID}-${row.item.id}`}
          />
        ))}
      </View>
      {list.length > FEED.tierPreview ? (
        <Button
          label={all ? 'Show fewer' : `Show ${Math.min(list.length, FEED.tierMax)}`}
          kind="quiet"
          onPress={() => setAll((a) => !a)}
          testID={`${testID}-toggle`}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.card,
    paddingHorizontal: CARD.bodyX,
  },
}));
