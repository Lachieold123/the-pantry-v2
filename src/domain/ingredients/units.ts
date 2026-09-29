// Units the app understands, and how they relate.
//
// Measures follow the Australian metric standard (D-013): 1 cup = 250 ml,
// 1 tbsp = 20 ml, 1 tsp = 5 ml. Imported recipes written for US measures
// are close enough for home cooking; the difference is noted in the
// recipe's audit text, not silently "corrected".

export type UnitKind = 'mass' | 'volume' | 'count' | 'length';

export type UnitId =
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'fl-oz'
  | 'cm'
  | 'clove'
  | 'tin'
  | 'bunch'
  | 'pinch'
  | 'handful'
  | 'slice'
  | 'sprig'
  | 'stick'
  | 'sheet'
  | 'head'
  | 'fillet'
  | 'rasher'
  | 'packet'
  | 'jar'
  | 'knob'
  | 'piece'
  | 'dash'
  | 'splash'
  | 'stalk'
  | 'leaf';

type UnitDef = {
  kind: UnitKind;
  /** Size in the kind's base unit (grams, millilitres, centimetres). Counts have none. */
  base?: number;
  singular: string;
  plural: string;
  /** Spellings found in recipe text, lower case. */
  spellings: readonly string[];
};

export const UNITS: Readonly<Record<UnitId, UnitDef>> = {
  g: { kind: 'mass', base: 1, singular: 'g', plural: 'g', spellings: ['g', 'gm', 'gram', 'grams', 'gr'] },
  kg: { kind: 'mass', base: 1000, singular: 'kg', plural: 'kg', spellings: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'] },
  oz: { kind: 'mass', base: 28.3495, singular: 'oz', plural: 'oz', spellings: ['oz', 'ounce', 'ounces'] },
  lb: { kind: 'mass', base: 453.592, singular: 'lb', plural: 'lb', spellings: ['lb', 'lbs', 'pound', 'pounds'] },
  ml: {
    kind: 'volume',
    base: 1,
    singular: 'ml',
    plural: 'ml',
    spellings: ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  },
  l: { kind: 'volume', base: 1000, singular: 'L', plural: 'L', spellings: ['l', 'litre', 'litres', 'liter', 'liters'] },
  tsp: { kind: 'volume', base: 5, singular: 'tsp', plural: 'tsp', spellings: ['tsp', 'tsps', 'teaspoon', 'teaspoons'] },
  tbsp: {
    kind: 'volume',
    base: 20,
    singular: 'tbsp',
    plural: 'tbsp',
    spellings: ['tbsp', 'tbsps', 'tablespoon', 'tablespoons', 'tbs', 'tb'],
  },
  cup: { kind: 'volume', base: 250, singular: 'cup', plural: 'cups', spellings: ['cup', 'cups'] },
  'fl-oz': {
    kind: 'volume',
    base: 29.5735,
    singular: 'fl oz',
    plural: 'fl oz',
    spellings: ['fl oz', 'fl. oz', 'fluid ounce', 'fluid ounces'],
  },
  cm: { kind: 'length', base: 1, singular: 'cm', plural: 'cm', spellings: ['cm'] },
  clove: { kind: 'count', singular: 'clove', plural: 'cloves', spellings: ['clove', 'cloves'] },
  tin: { kind: 'count', singular: 'tin', plural: 'tins', spellings: ['tin', 'tins', 'can', 'cans'] },
  bunch: { kind: 'count', singular: 'bunch', plural: 'bunches', spellings: ['bunch', 'bunches'] },
  pinch: { kind: 'count', singular: 'pinch', plural: 'pinches', spellings: ['pinch', 'pinches'] },
  handful: { kind: 'count', singular: 'handful', plural: 'handfuls', spellings: ['handful', 'handfuls'] },
  slice: { kind: 'count', singular: 'slice', plural: 'slices', spellings: ['slice', 'slices'] },
  sprig: { kind: 'count', singular: 'sprig', plural: 'sprigs', spellings: ['sprig', 'sprigs'] },
  stick: { kind: 'count', singular: 'stick', plural: 'sticks', spellings: ['stick', 'sticks'] },
  sheet: { kind: 'count', singular: 'sheet', plural: 'sheets', spellings: ['sheet', 'sheets'] },
  head: { kind: 'count', singular: 'head', plural: 'heads', spellings: ['head', 'heads'] },
  fillet: { kind: 'count', singular: 'fillet', plural: 'fillets', spellings: ['fillet', 'fillets'] },
  rasher: { kind: 'count', singular: 'rasher', plural: 'rashers', spellings: ['rasher', 'rashers'] },
  packet: { kind: 'count', singular: 'packet', plural: 'packets', spellings: ['packet', 'packets', 'pack', 'packs', 'pkt'] },
  jar: { kind: 'count', singular: 'jar', plural: 'jars', spellings: ['jar', 'jars'] },
  knob: { kind: 'count', singular: 'knob', plural: 'knobs', spellings: ['knob', 'knobs'] },
  piece: { kind: 'count', singular: 'piece', plural: 'pieces', spellings: ['piece', 'pieces'] },
  dash: { kind: 'count', singular: 'dash', plural: 'dashes', spellings: ['dash', 'dashes'] },
  splash: { kind: 'count', singular: 'splash', plural: 'splashes', spellings: ['splash', 'splashes'] },
  stalk: { kind: 'count', singular: 'stalk', plural: 'stalks', spellings: ['stalk', 'stalks'] },
  leaf: { kind: 'count', singular: 'leaf', plural: 'leaves', spellings: ['leaf', 'leaves'] },
};

const SPELLING_TO_UNIT: ReadonlyMap<string, UnitId> = new Map(
  (Object.keys(UNITS) as UnitId[]).flatMap((id) => UNITS[id].spellings.map((s) => [s, id] as const)),
);

/** Look up a unit by any spelling found in recipe text. Case-insensitive, trailing full stop ignored. */
export function unitFromText(text: string): UnitId | undefined {
  return SPELLING_TO_UNIT.get(text.toLowerCase().replace(/\.$/, ''));
}

/** Two amounts can be added together only when their units measure the same kind of thing. */
export function areConvertible(a: UnitId | undefined, b: UnitId | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  const da = UNITS[a];
  const db = UNITS[b];
  return da.kind === db.kind && da.base !== undefined && db.base !== undefined;
}

/** Convert an amount between two convertible units. Throws if they aren't: callers check first. */
export function convert(amount: number, from: UnitId, to: UnitId): number {
  if (from === to) return amount;
  const f = UNITS[from].base;
  const t = UNITS[to].base;
  if (f === undefined || t === undefined || UNITS[from].kind !== UNITS[to].kind) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }
  return (amount * f) / t;
}

export function unitLabel(unit: UnitId, amount: number): string {
  const def = UNITS[unit];
  return amount > 1 ? def.plural : def.singular;
}

export function unitKind(unit: UnitId): UnitKind {
  return UNITS[unit].kind;
}
