import type { Quantity } from './quantity';
import type { UnitId } from './units';

/** One line of a recipe's ingredient list, in structured form. */
export type IngredientLine = {
  quantity?: Quantity;
  unit?: UnitId;
  /** What it is, as the cook reads it: "brown onion", "crushed tomatoes". */
  item: string;
  /** Link into the ingredient database (aisle, avoid groups, nutrition). */
  ingredientId?: string;
  /** How it's prepared: "finely diced". */
  prep?: string;
  /** Extra guidance: "or half pork", "400g". */
  note?: string;
  optional?: boolean;
  /** The original text, kept for audit and as a display fallback. */
  raw: string;
};

export type ParseIssue = 'no-ingredient-match' | 'no-quantity' | 'multiple-ingredients' | 'serving-suggestion' | 'second-amount';

export type ParsedLine = { line: IngredientLine; issues: ParseIssue[] };

/** Finds the ingredient database entry an item refers to. Injected so parsing stays independent of the data. */
export type IngredientMatcher = (item: string) => string | undefined;
