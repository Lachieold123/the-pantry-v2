// Step 3 of the Cupboard, in v1's order (spec §7 Cupboard #8–10): "From your
// saved", then "Suggested for you", each a rail of ink match cards. Both lists
// come from store/cookable, so they agree with Home and "See all".
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { needLine, type CookableMatch } from '@/domain/cupboard/cookable';
import type { Recipe } from '@/domain/recipes/types';
import { savedNeedLine, tierCounts, type SavedMatch } from '@/domain/cupboard/shelves';
import { ingredientName } from '@/store/cookable';
import { MatchCard } from '@/ui/patterns/MatchCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

/** Cards per rail; "See all" has the rest. */
const RAIL = 10;

type Card = { recipe: Recipe; ready: boolean; need: string };

function Rail({ cards, prefix }: { cards: Card[]; prefix: string }) {
  const router = useRouter();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -SPACE.gutter }}
      // Stretch: every card takes the tallest card's height, whatever its title or need line.
      contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter, alignItems: 'stretch' }}
    >
      {cards.slice(0, RAIL).map((c) => (
        <MatchCard
          key={c.recipe.id}
          recipe={c.recipe}
          image={RECIPE_IMAGES[c.recipe.id]}
          ready={c.ready}
          need={c.need}
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: c.recipe.id } })}
          testID={`${prefix}${c.recipe.id}`}
        />
      ))}
    </ScrollView>
  );
}

export function MatchShelves({ fromSaved, suggested }: { fromSaved: SavedMatch[]; suggested: CookableMatch[] }) {
  const router = useRouter();
  if (fromSaved.length === 0 && suggested.length === 0) {
    return (
      <View style={{ gap: SPACE.xs }} testID="cupboard-no-matches">
        <SectionHeader kicker="Step 3 · What you can cook" title="Nothing close yet" />
        <Text variant="body" colour="inkSoft">
          Most recipes need a few more things. Add what else you have above.
        </Text>
      </View>
    );
  }
  // "Step 3" leads whichever shelf comes first, so the steps still read 1, 2, 3.
  const counts = tierCounts(suggested);
  const suggestedKicker = [
    fromSaved.length ? '' : 'Step 3',
    counts.ready ? `${counts.ready} ready` : '',
    counts.nearly ? `${counts.nearly} need 1–2` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={{ gap: SPACE.lg }}>
      {fromSaved.length ? (
        <View testID="cupboard-from-saved">
          <SectionHeader kicker={`Step 3 · ${fromSaved.length} from your Cookmarks`} title="From your saved" />
          <Rail
            prefix="saved-match-"
            cards={fromSaved.map((m) => ({ recipe: m.recipe, ready: m.ready, need: savedNeedLine(m.result, ingredientName) }))}
          />
        </View>
      ) : null}
      {suggested.length ? (
        <View testID="cupboard-suggested">
          <SectionHeader
            kicker={suggestedKicker}
            title="Suggested for you"
            action={<Button label="See all" kind="quiet" onPress={() => router.push('/cupboard/cookable')} testID="cupboard-see-all" />}
          />
          <Rail
            prefix="match-"
            cards={suggested.map((m) => ({ recipe: m.recipe, ready: m.tier === 'ready', need: needLine(m.result, ingredientName) }))}
          />
        </View>
      ) : null}
    </View>
  );
}
