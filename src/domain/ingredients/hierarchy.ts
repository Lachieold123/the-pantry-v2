// The ingredient model behind "what can I cook?": which pantry ingredient
// covers which recipe ingredient, and how well. Built once from the database
// and src/data/ingredients/hierarchy.json (see its _about).
//
// The rules, from strongest to weakest:
// - exact: the same ingredient.
// - specific: the pantry has a kind of what the recipe asks for (cheddar for
//   "tasty cheese", spaghetti for "pasta"). Always covers.
// - variety: the pantry has the generic and the recipe asks for a kind of it,
//   where any kind will do (potatoes for "waxy potatoes"). Only for the
//   generics listed as varieties: generic cheese never covers cheddar.
// - interchangeable: the conservative swap families from kitchen.json (D-030).
// - substitute: a stand-in that changes the dish a bit (dried thyme for
//   fresh). Partial credit; it covers only when the cook turns substitutes on.
// The table is worked out both ways, so the Cupboard can ask "what does this
// jar cover?" as easily as a recipe asks "do I have this?".
import type { IngredientDef, IngredientIndex } from './database';
import { normaliseWords } from './database';
import type { IngredientLine } from './types';

export type HierarchyData = {
  parents: Record<string, string>;
  varieties: string[];
  substitutes: string[][];
  aliases: Record<string, string[]>;
  relinks: Record<string, string>;
  oils: string[];
};

export type CoverKind = 'exact' | 'specific' | 'variety' | 'interchangeable' | 'substitute';

/** How much each kind counts towards a match score. */
export const COVER_CREDIT: Readonly<Record<CoverKind, number>> = { exact: 1, specific: 1, variety: 1, interchangeable: 1, substitute: 0.5 };

export type IngredientModel = {
  /** Pantry ingredients that could cover this recipe ingredient, best kind first (exact first). */
  coversFor: (needId: string) => readonly { id: string; kind: CoverKind }[];
  /** Recipe ingredients this pantry ingredient covers (the other direction). */
  coveredBy: (pantryId: string) => readonly { id: string; kind: CoverKind }[];
  /** The best cover for a need from what's in the pantry, or undefined. */
  bestCover: (needId: string, have: ReadonlySet<string>) => { id: string; kind: CoverKind } | undefined;
  isOil: (id: string) => boolean;
  /** The ingredient a recipe line really needs, after fixing known bad links. */
  relink: (line: Pick<IngredientLine, 'item' | 'raw' | 'ingredientId'>) => string | undefined;
};

const RANK: Readonly<Record<CoverKind, number>> = { exact: 0, specific: 1, variety: 2, interchangeable: 3, substitute: 4 };
const UNIT_WORDS = new Set(['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'about', 'x', 'whole', 'piece']);
const FILLER = new Set([
  'fresh',
  'large',
  'small',
  'medium',
  'good',
  'quality',
  'of',
  'and',
  'or',
  'a',
  'to',
  'taste',
  'the',
  'piece',
  'pinch',
]);

/** The database's entries with the model's extra AU/UK/US names added. */
export function withAliases(defs: readonly IngredientDef[], data: Pick<HierarchyData, 'aliases'>): IngredientDef[] {
  return defs.map((d) => {
    const extra = data.aliases[d.id];
    return extra?.length ? { ...d, aliases: [...new Set([...d.aliases, ...extra])] } : d;
  });
}

export function buildIngredientModel(
  index: IngredientIndex,
  data: HierarchyData,
  families: Record<string, string[]> = {},
): IngredientModel {
  const known = (id: string, where: string) => {
    if (!index.byId.has(id)) throw new Error(`Ingredient model (${where}) lists unknown ingredient: ${id}`);
  };
  // need -> pantry id -> kind; keeps the strongest kind for each pair.
  const table = new Map<string, Map<string, CoverKind>>();
  const put = (need: string, pantry: string, kind: CoverKind) => {
    if (need === pantry) return;
    const row = table.get(need) ?? new Map<string, CoverKind>();
    table.set(need, row);
    const was = row.get(pantry);
    if (!was || RANK[kind] < RANK[was]) row.set(pantry, kind);
  };

  const children = new Map<string, string[]>();
  for (const [child, parent] of Object.entries(data.parents)) {
    known(child, 'parents');
    known(parent, 'parents');
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const ancestors = (id: string): string[] => {
    const out: string[] = [];
    for (let p = data.parents[id]; p && !out.includes(p); p = data.parents[p]) out.push(p);
    return out;
  };
  const descendants = (id: string): string[] => (children.get(id) ?? []).flatMap((c) => [c, ...descendants(c)]);
  const varieties = new Set(data.varieties);
  for (const v of varieties) known(v, 'varieties');

  for (const id of index.byId.keys()) {
    // A specific pantry item covers every generic above it.
    for (const a of ancestors(id)) put(a, id, 'specific');
    // A generic that's a variety covers everything below it, and so do its siblings through it.
    if (varieties.has(id)) for (const d of descendants(id)) put(d, id, 'variety');
  }
  for (const members of Object.values(families)) for (const a of members) for (const b of members) put(a, b, 'interchangeable');
  for (const group of data.substitutes) {
    for (const id of group) known(id, 'substitutes');
    for (const a of group) for (const b of group) put(a, b, 'substitute');
  }
  for (const id of data.oils) known(id, 'oils');
  for (const [id, words] of Object.entries(data.aliases)) if (words.length) known(id, 'aliases');

  const sortedRow = (need: string) =>
    [...(table.get(need) ?? new Map<string, CoverKind>())]
      .map(([id, kind]) => ({ id, kind }))
      .sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.id.localeCompare(b.id));
  const coversFor = (need: string) => [{ id: need, kind: 'exact' as const }, ...sortedRow(need)];
  const reverse = new Map<string, { id: string; kind: CoverKind }[]>();
  for (const [need, row] of table)
    for (const [pantry, kind] of row) reverse.set(pantry, [...(reverse.get(pantry) ?? []), { id: need, kind }]);

  const relinkPhrases = Object.entries(data.relinks).map(([phrase, id]) => ({ words: normaliseWords(phrase), id }));
  const contains = (hay: readonly string[], needle: readonly string[]) => hay.some((_, i) => needle.every((w, j) => hay[i + j] === w));

  const fix = (line: Pick<IngredientLine, 'item' | 'raw' | 'ingredientId'>): string | undefined => {
    const words = normaliseWords(`${line.item} ${line.raw}`);
    for (const p of relinkPhrases) if (contains(words, p.words)) return p.id;
    const id = line.ingredientId;
    if (!id) return undefined;
    const def = index.byId.get(id);
    if (def && !def.staple) return id;
    // The generator sometimes linked a whole line to one word of it ("whole", "salt").
    // Read the line again without that word; if nothing matches, it's a real thing we don't stock.
    const head = line.raw.replace(/\([^)]*\)/g, ' ').split(',')[0] ?? '';
    if (!def) {
      const again = index.match(head);
      if (again && again !== id) return again;
    }
    const own = new Set(def ? normaliseWords([def.name, ...def.aliases].join(' ')) : normaliseWords(id));
    for (const text of [line.item, head]) {
      const rest = normaliseWords(text).filter((w) => !own.has(w) && !FILLER.has(w) && !UNIT_WORDS.has(w) && !/^\d/.test(w));
      if (!rest.length) continue;
      const other = index.match(rest.join(' '));
      if (other && !index.byId.get(other)?.staple) return other;
      if (!def && text === head) return `unknown:${rest.join('-')}`;
    }
    return def ? id : `unknown:${id}`;
  };
  // Lines are read many times (every recipe, every cupboard change): remember each answer.
  const seen = new WeakMap<object, string | undefined>();
  const relink: IngredientModel['relink'] = (line) => {
    if (seen.has(line)) return seen.get(line);
    const id = fix(line);
    seen.set(line, id);
    return id;
  };

  const oils = new Set(data.oils);
  return {
    coversFor,
    coveredBy: (pantryId) => reverse.get(pantryId) ?? [],
    bestCover: (need, have) => coversFor(need).find((c) => have.has(c.id)),
    isOil: (id) => oils.has(id),
    relink,
  };
}

/** Lines that never block a match: optional, garnish, "to serve", "to taste" and unmeasured extras. */
const SERVING = /\b(to serve|for serving|serving|to garnish|garnish|for garnish|optional|for dipping|to taste|if you like|if desired)\b/i;
export function blocksMatch(line: Pick<IngredientLine, 'raw' | 'note' | 'prep' | 'optional' | 'quantity'>): boolean {
  if (line.optional || line.quantity === undefined) return false;
  // "200 g feta, plus extra to serve" still needs the feta.
  if (/\bplus\b|\band (extra|more)\b/i.test(line.raw)) return true;
  return !SERVING.test(`${line.raw} ${line.note ?? ''} ${line.prep ?? ''}`);
}
