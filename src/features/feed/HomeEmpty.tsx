// What Home says when there are no cards, in plain words and with the one
// thing to do next. "What I have" with an empty cupboard is the common case on
// a first open, so it points straight at the Cupboard.
import { EmptyState } from '@/ui/patterns/EmptyState';

type Props = {
  pantry: boolean;
  stocked: number;
  filtered: boolean;
  onClear: () => void;
  onCupboard: () => void;
  onEverything: () => void;
  onBrowse: () => void;
};

export function HomeEmpty({ pantry, stocked, filtered, onClear, onCupboard, onEverything, onBrowse }: Props) {
  if (pantry && stocked === 0) {
    return (
      <EmptyState
        title="What’s in your cupboard?"
        body="Add what you have and this shows the dishes you can cook without shopping."
        action={{ label: 'Add what you have', onPress: onCupboard }}
        testID="home-pantry-empty"
      />
    );
  }
  if (filtered) {
    return (
      <EmptyState
        title="Nothing here yet"
        body={
          pantry
            ? 'Nothing you can make fits all of those. Try a different filter.'
            : 'No recipes match all of those. Try a different filter.'
        }
        action={{ label: 'Clear filters', onPress: onClear }}
        testID="home-no-match"
      />
    );
  }
  if (pantry) {
    return (
      <EmptyState
        title="Nothing close yet"
        body="Most dishes need a few more things than you have. Add a couple more to your cupboard, or look at everything."
        action={{ label: 'See everything', onPress: onEverything }}
        testID="home-pantry-none"
      />
    );
  }
  return (
    <EmptyState
      title="Nothing to suggest yet"
      body="Your diet and avoid list rule out every recipe. Loosen them in Settings, or browse everything."
      action={{ label: 'Browse recipes', onPress: onBrowse }}
      testID="feed-empty"
    />
  );
}
