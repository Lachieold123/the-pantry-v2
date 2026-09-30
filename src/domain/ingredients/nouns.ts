// Singular and plural for counted ingredients, so "3 large onions" scaled to
// one reads "1 large onion" (K-2). Only the last word changes, and only for
// things counted without a unit. Australian spellings: chilli, chillies.

const IRREGULAR: Readonly<Record<string, string>> = {
  chilli: 'chillies',
  tomato: 'tomatoes',
  potato: 'potatoes',
  leaf: 'leaves',
  loaf: 'loaves',
  half: 'halves',
  knife: 'knives',
  mango: 'mangoes',
};
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(IRREGULAR).map(([s, p]) => [p, s]));

/** Words that look plural but aren't, or that don't change. */
const INVARIANT = new Set([
  'asparagus',
  'couscous',
  'hummus',
  'molasses',
  'swiss',
  'brussels',
  'fish',
  'shrimp',
  // Counted in a recipe but never pluralised: "2 bok choy", "2 garlic".
  'choy',
  'garlic',
  'ginger',
  'celery',
  'spinach',
  'kale',
  'broccoli',
  'broccolini',
  'parsley',
  'coriander',
  'basil',
  'mint',
  'dill',
  'thyme',
  'rosemary',
  'sage',
  'rice',
]);

function keepCase(original: string, changed: string): string {
  return original[0] === original[0]?.toUpperCase() ? changed.charAt(0).toUpperCase() + changed.slice(1) : changed;
}

export function singularWord(word: string): string {
  const w = word.toLowerCase();
  if (INVARIANT.has(w) || w.length <= 3) return word;
  const irregular = IRREGULAR_PLURALS[w];
  if (irregular) return keepCase(word, irregular);
  if (w.endsWith('ies')) return keepCase(word, `${w.slice(0, -3)}y`);
  if (/(ches|shes|xes|sses|zes)$/.test(w)) return keepCase(word, w.slice(0, -2));
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) return keepCase(word, w.slice(0, -1));
  return word;
}

export function pluralWord(word: string): string {
  const w = word.toLowerCase();
  if (INVARIANT.has(w) || w.length <= 2) return word;
  const irregular = IRREGULAR[w];
  if (irregular) return keepCase(word, irregular);
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) return word; // already plural
  if (/[^aeiou]y$/.test(w)) return keepCase(word, `${w.slice(0, -1)}ies`);
  if (/(ch|sh|x|ss|z)$/.test(w)) return keepCase(word, `${w}es`);
  return keepCase(word, `${w}s`);
}

/**
 * Words that count the thing after them: in "2 portions fresh ramen noodles"
 * it's "portions" that agrees with the number, not "noodles".
 */
const COUNTER_NOUNS = new Set([
  'portion',
  'bottle',
  'square',
  'rack',
  'bulb',
  'strip',
  'ball',
  'block',
  'bag',
  'box',
  'carton',
  'cube',
  'loaf',
  'wedge',
  'punnet',
]);

/**
 * The item with its counting word made singular (amount ≤ 1) or plural: a
 * leading counter noun if there is one ("1 portion fresh ramen noodles"),
 * otherwise the last word. Callers only use it when the number crossed one.
 */
export function inflectItem(item: string, amount: number): string {
  const inflect = (word: string) => (amount <= 1 ? singularWord(word) : pluralWord(word));
  const lead = /^([A-Za-z]+)(\s.*)$/.exec(item);
  if (lead?.[1] && COUNTER_NOUNS.has(singularWord(lead[1]).toLowerCase())) return inflect(lead[1]) + (lead[2] ?? '');
  const match = /^(.*?)([A-Za-z]+)$/.exec(item);
  if (!match) return item;
  const [, head = '', last = ''] = match;
  return head + inflect(last);
}
