// Turns Claude's draft into the app's Recipe, using the app's own parser,
// validator and diet rules (_domain.js, bundled from src/domain). Pure: no
// network, no database, so it can be tested on its own (recipe.test.ts).

import { buildIngredientIndex, deriveDiets, parseIngredientLine, validateRecipe } from './_domain.js';
import { INGREDIENTS } from './_ingredients.js';

export type Draft = {
  title: string;
  summary: string;
  caption: string;
  cuisine: string;
  region?: string;
  mealTypes: string[];
  difficulty: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  onePot: boolean;
  seasons?: string[];
  ingredientGroups: { title?: string; lines: string[] }[];
  steps: string[];
  notes?: string[];
  newIngredients: NewIngredient[];
  photoQuery: string;
  photoFallbackQuery: string;
  photoDescription: string;
};

export type NewIngredient = {
  kind: 'alias' | 'new';
  name: string;
  aliasOf?: string;
  aliases?: string[];
  aisle?: string;
  groups?: string[];
  swapId?: string;
  swapTip?: string;
};

export type Extra = {
  id: string;
  kind: 'alias' | 'new';
  alias_of: string | null;
  name: string;
  aliases: string[];
  aisle: string | null;
  groups: string[];
  swap_id?: string | null;
  swap_tip?: string | null;
  status: string;
};

type Def = { id: string; name: string; aisle: string; aliases: string[]; groups: string[]; plural?: string; staple?: boolean };
type Line = { item: string; ingredientId?: string; quantity?: unknown; optional?: boolean; raw: string };

export const BASE_IDS: ReadonlySet<string> = new Set((INGREDIENTS as Def[]).map((d) => d.id));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** The database the app ships, plus the extras: aliases folded into their item, new items added. */
export function buildIndex(extras: Extra[]) {
  const defs = (INGREDIENTS as Def[]).map((d) => ({ ...d, aliases: [...d.aliases] }));
  const byId = new Map(defs.map((d) => [d.id, d]));
  // "leaves" singularises to "leave", not "leaf", so give leafy names both forms.
  const withLeaves = (names: string[]) =>
    names.flatMap((n) => [n, ...(/\bleaf\b/.test(n) ? [n.replace(/\bleaf\b/g, 'leaves')] : []), ...(/\bleaves\b/.test(n) ? [n.replace(/\bleaves\b/g, 'leaf')] : [])]);
  for (const e of extras) {
    // A rejected item, or an alias the checker says is a different thing, never matches.
    if (e.status === 'rejected' || (e.kind === 'alias' && e.status === 'needs-review')) continue;
    if (e.kind === 'alias') {
      byId.get(e.alias_of ?? '')?.aliases.push(...withLeaves([e.name, ...e.aliases].map((a) => a.toLowerCase())));
    } else if (!byId.has(e.id)) {
      const def = { id: e.id, name: e.name, aisle: e.aisle ?? 'other', aliases: withLeaves([e.name, ...e.aliases].map((a) => a.toLowerCase())), groups: e.groups };
      defs.push(def);
      byId.set(e.id, def);
    }
  }
  return buildIngredientIndex(defs);
}

export type Assembled = {
  recipe: Record<string, unknown>;
  problems: string[];
  /** True while a line uses a new ingredient whose groups aren't confirmed: no diet is claimed. */
  dietsPending: boolean;
  /** Ingredients no name in the database matched. The checker declares these rather than send the recipe back. */
  unmatched: string[];
};

const FAHRENHEIT = /°\s?F\b|\bfahrenheit\b/i;
const IMPERIAL = /\b(oz|ounces?|lbs?|pounds?|quarts?|sticks? of butter)\b/i;

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
  : typeof v === 'string' ? v.split('\n').map((x) => x.replace(/^\s*(\d+[.)]|[-•])\s*/, '').trim()).filter(Boolean) : [];

/** Models sometimes return a list as one string, or leave a field out. Repair the shape, or say what's missing. */
export function normaliseDraft(input: unknown): { draft?: Draft; problems: string[] } {
  const d = (input ?? {}) as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of ['title', 'summary', 'caption', 'cuisine', 'difficulty', 'photoQuery'] as const) {
    if (typeof d[key] !== 'string' || !(d[key] as string).trim()) problems.push(`${key} is missing`);
  }
  const groups = Array.isArray(d.ingredientGroups) ? d.ingredientGroups : [];
  const ingredientGroups = groups
    .map((g) => ({ title: typeof g?.title === 'string' && g.title.trim() ? g.title : undefined, lines: asStrings(g?.lines) }))
    .filter((g) => g.lines.length);
  if (!ingredientGroups.length) problems.push('ingredientGroups has no lines');
  const steps = asStrings(d.steps);
  if (!steps.length) problems.push('steps is missing');
  const num = (v: unknown) => (typeof v === 'number' ? Math.round(v) : Number.parseInt(String(v), 10));
  if (problems.length) return { problems };
  return {
    problems,
    draft: {
      ...(d as unknown as Draft),
      mealTypes: asStrings(d.mealTypes),
      seasons: asStrings(d.seasons),
      prepMinutes: num(d.prepMinutes),
      cookMinutes: num(d.cookMinutes),
      servings: num(d.servings),
      onePot: d.onePot === true,
      region: typeof d.region === 'string' ? d.region : undefined,
      notes: asStrings(d.notes),
      ingredientGroups,
      steps,
      newIngredients: Array.isArray(d.newIngredients) ? (d.newIngredients as NewIngredient[]).filter((n) => n && typeof n.name === 'string') : [],
      photoFallbackQuery: typeof d.photoFallbackQuery === 'string' ? d.photoFallbackQuery : (d.photoQuery as string),
      photoDescription: typeof d.photoDescription === 'string' ? d.photoDescription : (d.summary as string),
    },
  };
}

export function assemble(id: string, draft: Draft, extras: Extra[]): Assembled {
  const index = buildIndex(extras);
  const problems: string[] = [];
  const unmatched: string[] = [];

  const ingredientGroups = draft.ingredientGroups.map((g) => ({
    ...(g.title ? { title: g.title } : {}),
    items: g.lines.map((raw) => {
      const { line, issues } = parseIngredientLine(raw, index.match) as { line: Line; issues: string[] };
      if (issues.includes('no-ingredient-match') && !line.optional) unmatched.push(line.item);
      return line;
    }),
  }));

  const recipe: Record<string, unknown> = {
    id,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    cuisine: draft.cuisine,
    diets: [],
    mealTypes: draft.mealTypes,
    difficulty: draft.difficulty,
    prepMinutes: draft.prepMinutes,
    cookMinutes: draft.cookMinutes,
    servings: draft.servings,
    onePot: draft.onePot,
    ...(draft.seasons?.length ? { seasons: draft.seasons } : {}),
    ingredientGroups,
    steps: draft.steps.map((text) => ({ text: text.trim() })),
    ...(draft.notes?.length ? { notes: draft.notes } : {}),
    source: 'user',
  };

  for (const p of validateRecipe(recipe) as { path: string; message: string }[]) problems.push(`${p.path} ${p.message}`);

  const lines = ingredientGroups.flatMap((g) => g.items);
  if (lines.length < 3 || lines.length > 30) problems.push(`has ${lines.length} ingredients; keep it between 3 and 30`);
  if (draft.steps.length < 3 || draft.steps.length > 14) problems.push(`has ${draft.steps.length} steps; keep it between 3 and 14`);
  if (draft.prepMinutes + draft.cookMinutes < 5) problems.push('total time under 5 minutes is not believable');
  const text = [...draft.ingredientGroups.flatMap((g) => g.lines), ...draft.steps, ...(draft.notes ?? [])].join('\n');
  if (FAHRENHEIT.test(text)) problems.push('uses Fahrenheit; use °C');
  if (IMPERIAL.test(text)) problems.push('uses imperial measures; use metric');
  for (const m of text.matchAll(/(\d{2,3})\s?°C/g)) {
    const c = Number(m[1]);
    if (c > 300) problems.push(`${c}°C is hotter than a home oven`);
  }

  const pendingIds = new Set(extras.filter((e) => e.kind === 'new' && e.status !== 'verified' && e.status !== 'approved').map((e) => e.id));
  const dietsPending = lines.some((l) => !l.optional && l.ingredientId !== undefined && pendingIds.has(l.ingredientId));
  // Same rule as the app: diets come from what's in the list, never from the title (D-006).
  recipe.diets = dietsPending ? [] : deriveDiets(lines, index.byId);

  return { recipe, problems, dietsPending, unmatched };
}

/** Checks and normalises the extras a draft declares, before they're stored. */
export function cleanNewIngredients(list: NewIngredient[], aisles: readonly string[], groups: readonly string[]) {
  /** `auto`: the writer's groups can't be trusted (or there are none), so the checker's answer decides them. */
  const ok: (Omit<Extra, 'status'> & { auto?: boolean })[] = [];
  const problems: string[] = [];
  const known = buildIndex([]);
  for (const raw of list) {
    // "taro leaves (lau dalo)" → name "taro leaves", alias "lau dalo": the name must match the words in the line.
    const bracket = /\(([^)]*)\)/.exec(raw.name ?? '');
    const n = {
      ...raw,
      name: (raw.name ?? '').replace(/\([^)]*\)/g, '').trim(),
      aliases: [...(Array.isArray(raw.aliases) ? raw.aliases.filter((a) => typeof a === 'string') : []), ...(bracket?.[1] ? [bracket[1].trim()] : [])],
      groups: Array.isArray(raw.groups) ? raw.groups : [],
    };
    const id = slugify(n.name);
    // Nothing to add when the database already knows the name (it has gochugaru and jeera, for instance).
    if (!id || known.match(n.name) !== undefined) continue;
    if (n.kind === 'alias' && (!n.aliasOf || !BASE_IDS.has(n.aliasOf))) {
      // An alias of something the database doesn't have ("freekeh" → "freekeh") is really a new
      // ingredient. Declaring it here, with the checker deciding its groups, is far cheaper than a rewrite.
      ok.push({ id, kind: 'new', alias_of: null, name: n.name, aliases: n.aliases ?? [], aisle: 'other', groups: [], auto: true });
    } else if (n.kind === 'alias') {
      ok.push({ id, kind: 'alias', alias_of: n.aliasOf!, name: n.name, aliases: n.aliases ?? [], aisle: null, groups: [] });
    } else {
      ok.push({
        id,
        kind: 'new',
        alias_of: null,
        name: n.name,
        aliases: n.aliases ?? [],
        aisle: n.aisle && aisles.includes(n.aisle) ? n.aisle : 'other',
        groups: (n.groups ?? []).filter((g) => groups.includes(g)),
        swap_id: n.swapId && BASE_IDS.has(n.swapId) ? n.swapId : null,
        swap_tip: n.swapTip?.slice(0, 240) ?? null,
      });
    }
  }
  return { ok, problems };
}
