// The app's own recipe rules, bundled for the seed-kitchen function
// (`npm run seed:bundle` writes supabase/functions/seed-kitchen/_domain.js).
// House cooks' recipes pass exactly the checks a recipe typed in the app
// passes, from the same code: one source of truth (CLAUDE.md).

export { buildIngredientIndex, AISLES, INGREDIENT_GROUPS } from '../../src/domain/ingredients/database';
export type { IngredientDef, IngredientIndex } from '../../src/domain/ingredients/database';
export { parseIngredientLine } from '../../src/domain/ingredients/parse';
export { validateRecipe } from '../../src/domain/recipes/validate';
export { deriveDiets } from '../../src/domain/recipes/diets';
export { CUISINES, MEAL_TYPES, DIFFICULTIES, SEASONS } from '../../src/domain/recipes/types';
export { CUISINE_LABELS } from '../../src/domain/recipes/labels';
// The ingredient database itself ships beside the bundle as _ingredients.js
// (npm run seed:bundle), trimmed to what matching and diets need.
