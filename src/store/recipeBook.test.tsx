// A recipe saved on the phone before rows were checked can't take every screen down (SEC-05).
import { useHousehold } from './household';
import { getRecipe } from './recipeBook';

it('skips a shared recipe that can’t be read, and still finds the catalogue', () => {
  const broken = { id: 'x', draft: {}, source: 'user', createdAt: 1, updatedAt: 1 } as never;
  useHousehold.setState({ sharedRecipes: { x: broken } });
  expect(() => getRecipe('x')).not.toThrow();
  expect(getRecipe('x')).toBeUndefined();
  expect(getRecipe('carbonara')?.id).toBe('carbonara');
});
