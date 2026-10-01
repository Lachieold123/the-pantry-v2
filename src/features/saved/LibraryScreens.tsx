// My recipes, opened from the side menu. The other library pages have their
// own files (Cookmarks, Collections, Recently viewed, Kitchen stats).
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { Screen } from '@/ui/primitives/Screen';
import { MineList } from './MineList';

export function MyRecipesScreen() {
  return (
    <Screen testID="my-recipes-screen">
      <PushedHeader kicker="My kitchen" title="My recipes" />
      <MineList />
    </Screen>
  );
}
