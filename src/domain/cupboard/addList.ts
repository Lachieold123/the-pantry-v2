// "Add a list": type or paste what you've got ("eggs, 2 onions, half a
// cabbage, feta") and each part is matched to an ingredient for review. Free,
// offline and instant; photo and receipt scans will feed the same review.

import type { IngredientIndex } from '../ingredients/database';
import { parseIngredientLine } from '../ingredients/parse';

export type ListGuess = { text: string; id?: string };

/** Splits on new lines, commas, semicolons and " and ", then matches each part. Duplicates collapse. */
export function readPantryList(text: string, index: IngredientIndex): ListGuess[] {
  const parts = text
    .split(/[\n,;•]+|\s+and\s+|\s+&\s+/i)
    .map((p) => p.replace(/^[-*\d.)\s]+(?=[a-z])/i, '').trim())
    .filter((p) => p.length > 1);
  const seen = new Set<string>();
  const out: ListGuess[] = [];
  for (const part of parts) {
    const id = parseIngredientLine(part, index.match).line.ingredientId;
    const key = id ?? part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id ? { text: part, id } : { text: part });
  }
  return out;
}
