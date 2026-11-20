// The Plan badge counts only meals whose recipe still exists (F-10).
import { renderHook } from '@testing-library/react-native';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { usePlan } from '@/store/plan';
import { usePlanBadge } from './useCounts';

it('leaves a planned recipe that no longer exists out of the Plan badge', async () => {
  const live = CATALOGUE[0]!.id;
  usePlan.setState({
    entries: [
      { id: 'a', recipeId: live, day: '2099-01-01', slot: 'dinner', servings: 2 },
      { id: 'b', recipeId: 'no-such-recipe', day: '2099-01-02', slot: 'dinner', servings: 2 },
    ],
  });
  const { result } = await renderHook(() => usePlanBadge());
  expect(result.current).toBe(1);
});
