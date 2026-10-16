import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex } from '/Users/lachlanoldfield/Developer/the-pantry-v2-main/src/domain/ingredients/database.ts';
import { dietTextProblems, orLines } from '/Users/lachlanoldfield/Developer/the-pantry-v2-main/scripts/recipe-text-checks.mts';
const R = '/Users/lachlanoldfield/Developer/the-pantry-v2-main';
const J = (p: string) => JSON.parse(readFileSync(`${R}/${p}`, 'utf8'));
const feed = J('docs/backups/supabase-2026-10-17/published_recipes.json') as any[];
const cat = new Map((J('src/data/catalogue/recipes.json') as any[]).map((r) => [r.id, r]));
const index = buildIngredientIndex(J('src/data/ingredients/ingredients.json'));
const b3 = new Set((J('scripts/data/house-recipes/batch-03.json').recipes as any[]).map((h) => h.id));
const b12 = ['batch-01', 'batch-02'].flatMap((f) => (J(`scripts/data/house-recipes/${f}.json`).recipes as any[]).map((h) => h.id));
const forFeed = (r: any, id: string) => {
  const { image, author, ...rest } = r;
  return { ...rest, id, source: 'user' };
};
const cols = (r: any) => ({ title: r.title.slice(0, 80), cuisine: r.cuisine, meal_types: r.mealTypes.slice(0, 4), diets: r.diets, difficulty: r.difficulty, total_minutes: Math.max(1, r.prepMinutes + r.cookMinutes) });
const updates: any[] = [];
const log: Record<string, number> = {};
const bump = (k: string) => (log[k] = (log[k] ?? 0) + 1);
for (const row of feed) {
  if (b3.has(row.slug)) {
    const r = forFeed(cat.get(row.slug), row.recipe.id);
    updates.push({ id: row.id, ...cols(r), recipe: r });
    bump('cleaned from batch-03');
    continue;
  }
  // Not in batch-03 (its title is in the catalogue): tag and line fixes in place.
  const rec = structuredClone(row.recipe);
  const lines = rec.ingredientGroups.flatMap((g: any) => g.items);
  let diets: string[] = [...rec.diets];
  const ids = new Set(lines.map((l: any) => l.ingredientId));
  if (ids.has('japanese-curry-roux-block')) diets = diets.filter((d) => d !== 'no-dairy' && d !== 'vegan' && d !== 'no-gluten');
  if (ids.has('andouillette')) diets = diets.filter((d) => d !== 'no-gluten');
  for (const p of dietTextProblems(diets as never, lines.map((l: any) => `${l.item}${l.optional ? ' (optional)' : ''}`))) {
    const tag = /^tagged (\S+)/.exec(p)![1]!;
    diets = diets.filter((d) => d !== tag);
    if (tag === 'vegetarian') diets = diets.filter((d) => d !== 'vegan');
  }
  for (const l of lines) {
    if (!orLines([l.item], index.match).length) continue;
    const [a, ...b] = l.item.split(/\s(?:or|and\/or)\s/);
    l.raw = l.raw.replace(l.item, `${a} (or ${b.join(' or ')})`);
    l.item = a;
    l.note = l.note ? `or ${b.join(' or ')}; ${l.note}` : `or ${b.join(' or ')}`;
    bump('or-lines fixed');
  }
  const changed = JSON.stringify(diets) !== JSON.stringify(rec.diets) || JSON.stringify(rec) !== JSON.stringify(row.recipe);
  if (!changed) { bump('unchanged'); continue; }
  if (JSON.stringify(diets) !== JSON.stringify(rec.diets)) bump('diet tags corrected');
  rec.diets = diets;
  updates.push({ id: row.id, title: row.title, cuisine: row.cuisine, meal_types: row.meal_types, diets, difficulty: row.difficulty, total_minutes: row.total_minutes, recipe: rec });
}
const taken = new Set(feed.flatMap((r) => [r.slug, r.title.toLowerCase()]));
const inserts = b12.filter((id) => !taken.has(id) && !taken.has(cat.get(id).title.toLowerCase())).map((id) => {
  const r = forFeed(cat.get(id), id);
  return { slug: id, ...cols(r), recipe: r };
});
writeFileSync('/private/tmp/claude-501/-Users-lachlanoldfield-telegram-bot/d976cd07-caa7-4382-85a6-af608edc7c1e/scratchpad/feed-updates.json', JSON.stringify(updates));
writeFileSync('/private/tmp/claude-501/-Users-lachlanoldfield-telegram-bot/d976cd07-caa7-4382-85a6-af608edc7c1e/scratchpad/feed-inserts.json', JSON.stringify(inserts));
console.log(log, 'updates', updates.length, 'inserts', inserts.length);
