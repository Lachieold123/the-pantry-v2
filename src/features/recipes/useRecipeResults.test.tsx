// Browse's results and search follow diet and the avoid list, like its shelves (BUG-07).
import { act, renderHook } from '@testing-library/react-native';

import { CATALOGUE, INGREDIENTS } from '@/data/catalogue/catalogue';
import { containsAvoided } from '@/domain/recipes/diets';
import { usePreferences } from '@/store/preferences';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useRecipeResults } from './useRecipeResults';

it('a vegetarian who avoids nuts sees no meat or nuts in results or search', async () => {
  const avoid = { options: ['nuts' as const], custom: [] };
  usePreferences.setState({ diet: 'vegetarian', avoid });
  useRecipeFilters.setState({ query: '', showAll: true });
  const { result } = await renderHook(() => useRecipeResults());
  expect(result.current.results.length).toBeGreaterThan(0);
  expect(result.current.results.length).toBeLessThan(CATALOGUE.length);
  for (const r of result.current.results) {
    expect(r.diets).toContain('vegetarian');
    expect(containsAvoided(r, avoid, INGREDIENTS)).toBe(false);
  }
  await act(async () => useRecipeFilters.setState({ query: 'chicken' }));
  expect(result.current.results.every((r) => r.diets.includes('vegetarian'))).toBe(true);
});
