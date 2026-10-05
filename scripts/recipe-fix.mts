// Applies one recipe's hand fixes from scripts/data/recipe-fixes.json to its
// raw text, before parsing. Kept apart from the converter so each file stays
// readable, and so the rules are in one place:
//
// - Every "from", "line" and "after" must match exactly ONE ingredient line
//   or step, or it's reported as a problem and skipped. A fix that silently
//   lands in the wrong place is worse than one that fails loudly.
// - Replacements apply in the order written, so a later fix sees the text an
//   earlier one produced. That lets a new review append to an old fix.
// - Ingredient fixes run across all groups at once (a line's group doesn't
//   change what it says), then moves, then additions.

import type { Difficulty } from '../src/domain/recipes/types.ts';

export type Replacement = { from: string; to: string };
export type Fix = {
  steps?: Replacement[];
  ingredients?: Replacement[];
  addNotes?: string[];
  /** `false` drops a photo that shows the wrong dish, so the recipe gets its plain cuisine tile instead. */
  image?: false;
  times?: { prepMinutes?: number; cookMinutes?: number };
  difficulty?: Difficulty;
  servings?: number;
  /** `group: null` means the first group. */
  addIngredients?: { group: string | null; line: string }[];
  moveIngredients?: { line: string; toGroup: string }[];
  /** `after: ''` means before the first step. */
  addSteps?: { after: string; text: string }[];
};

export type RawRecipe = {
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty?: Difficulty;
  ingredients: { section?: string; items: string[] }[];
  steps: string[];
  notes?: string[];
};

type Report = { problem: (message: string) => void; applied: (what: string) => void };

/** Index of the one text containing `needle`, or undefined (and a problem) when it isn't exactly one. */
function only(texts: string[], needle: string, say: (hits: number) => void): number | undefined {
  const hits = texts.reduce<number[]>((acc, t, i) => (t.includes(needle) ? [...acc, i] : acc), []);
  if (hits.length !== 1) {
    say(hits.length);
    return undefined;
  }
  return hits[0];
}

function replaceAll(texts: string[], replacements: Replacement[], say: (r: Replacement, hits: number) => void, done: () => void): string[] {
  let out = texts;
  for (const r of replacements) {
    const at = only(out, r.from, (hits) => say(r, hits));
    if (at === undefined) continue;
    out = out.map((t, i) => (i === at ? t.replace(r.from, r.to) : t));
    done();
  }
  return out;
}

export function applyFix(id: string, recipe: RawRecipe, fix: Fix | undefined, report: Report): RawRecipe {
  if (!fix) return recipe;
  const groupIndex = (title: string | null) => (title === null ? 0 : recipe.ingredients.findIndex((g) => (g.section ?? null) === title));

  // Flatten to [group, text] so a replacement can be checked across every group.
  let lines = recipe.ingredients.flatMap((g, gi) => g.items.map((text) => ({ gi, text })));
  const replaced = replaceAll(
    lines.map((l) => l.text),
    fix.ingredients ?? [],
    (r, hits) => report.problem(`${id}: fix for ingredients matched ${hits} times: "${r.from}"`),
    () => report.applied(`${id} (ingredients)`),
  );
  lines = lines.map((l, i) => ({ gi: l.gi, text: replaced[i] ?? l.text }));

  for (const m of fix.moveIngredients ?? []) {
    const to = groupIndex(m.toGroup);
    const at = only(
      lines.map((l) => l.text),
      m.line,
      (hits) => report.problem(`${id}: ingredient to move matched ${hits} times: "${m.line}"`),
    );
    if (at === undefined || to < 0) {
      if (to < 0) report.problem(`${id}: no ingredient group "${m.toGroup}"`);
      continue;
    }
    const [moved] = lines.splice(at, 1);
    if (moved) lines.push({ gi: to, text: moved.text });
    report.applied(`${id} (move ingredient)`);
  }
  for (const a of fix.addIngredients ?? []) {
    const to = groupIndex(a.group);
    if (to < 0) {
      report.problem(`${id}: no ingredient group "${a.group}"`);
      continue;
    }
    lines.push({ gi: to, text: a.line });
    report.applied(`${id} (add ingredient)`);
  }

  let steps = replaceAll(
    recipe.steps,
    fix.steps ?? [],
    (r, hits) => report.problem(`${id}: fix for steps matched ${hits} times: "${r.from}"`),
    () => report.applied(`${id} (steps)`),
  );
  for (const a of fix.addSteps ?? []) {
    const at =
      a.after === '' ? -1 : only(steps, a.after, (hits) => report.problem(`${id}: new step's "after" matched ${hits} times: "${a.after}"`));
    if (at === undefined) continue;
    steps = [...steps.slice(0, at + 1), a.text, ...steps.slice(at + 1)];
    report.applied(`${id} (add step)`);
  }

  const notes = [...(recipe.notes ?? []), ...(fix.addNotes ?? [])];
  fix.addNotes?.forEach(() => report.applied(`${id} (note)`));
  for (const what of ['times', 'difficulty', 'servings'] as const) if (fix[what] !== undefined) report.applied(`${id} (${what})`);

  const difficulty = fix.difficulty ?? recipe.difficulty;
  return {
    servings: fix.servings ?? recipe.servings,
    prepMinutes: fix.times?.prepMinutes ?? recipe.prepMinutes,
    cookMinutes: fix.times?.cookMinutes ?? recipe.cookMinutes,
    ...(difficulty ? { difficulty } : {}),
    ingredients: recipe.ingredients.map((g, gi) => ({
      ...(g.section ? { section: g.section } : {}),
      items: lines.filter((l) => l.gi === gi).map((l) => l.text),
    })),
    steps,
    ...(notes.length ? { notes } : {}),
  };
}
