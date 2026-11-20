// How one search word matches one recipe word: exactly, as the start of it,
// or with a typo or two. Kept apart from search.ts so the matching rules
// (and their cost: they run for every word of every recipe as you type) are
// in one place.

/**
 * Edit distance with adjacent swaps counted as one edit ("chikcen"). Stops
 * early past `limit`. Keeps only the three rows it needs, not the whole
 * table, since it runs thousands of times per keystroke (audit, performance).
 */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let older = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    row[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (older[j - 2] as number) + 1);
      row[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > limit) return limit + 1;
    [older, prev, row] = [prev, row, older];
  }
  return prev[b.length] as number;
}

/** Typos allowed for a word of this length: none for short words, where a typo is usually a different word. */
function allowedTypos(length: number): number {
  if (length < 4) return 0;
  if (length < 8) return 1;
  return 2;
}

export function wordMatches(query: string, word: string): 'exact' | 'prefix' | 'fuzzy' | undefined {
  if (word === query) return 'exact';
  if (query.length >= 2 && word.startsWith(query)) return 'prefix';
  const typos = allowedTypos(query.length);
  if (typos > 0 && editDistance(query, word, typos) <= typos) return 'fuzzy';
  // Allow a typo inside a word still being typed: "chik" → "chicken".
  if (typos > 0 && word.length > query.length && editDistance(query, word.slice(0, query.length), typos) <= typos) return 'fuzzy';
  return undefined;
}

/**
 * Other spellings that mean the same thing here: US and British names for
 * what the recipes call by their Australian names (BUG-14). The ingredient
 * database's own aliases ("shrimp" for prawn) are indexed with each recipe;
 * this covers words that also appear in titles and methods.
 */
const SAME_AS: Readonly<Record<string, string>> = {
  chili: 'chilli',
  chilies: 'chillies',
  chiles: 'chillies',
  cilantro: 'coriander',
  aubergine: 'eggplant',
  aubergines: 'eggplant',
  courgette: 'zucchini',
  courgettes: 'zucchini',
  barbecue: 'bbq',
  barbecued: 'bbq',
  bbq: 'barbecue',
  shrimp: 'prawn',
  shrimps: 'prawns',
  bell: 'capsicum',
  arugula: 'rocket',
  garbanzo: 'chickpea',
  yoghurt: 'yogurt',
  yogurt: 'yoghurt',
};

/** A query word and the other spellings it should also find. */
export function spellings(word: string): string[] {
  const other = SAME_AS[word];
  return other ? [word, ...other.split(' ')] : [word];
}
