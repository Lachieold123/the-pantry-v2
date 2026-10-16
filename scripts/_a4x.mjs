import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
export const FS = 'Food safety: ';
export const R = (id, title, summary, cuisine, difficulty, prepMinutes, cookMinutes, servings, onePot, ings, steps, notes, n, mealTypes = ['dinner']) => ({
  id, title, summary, cuisine, mealTypes, difficulty, prepMinutes, cookMinutes, servings, onePot, diets: [],
  ingredients: [{ items: ings }], steps, notes,
  nutrition: { kcal: n[0], proteinG: n[1], carbsG: n[2], fatG: n[3], fibreG: n[4], sodiumMg: n[5] },
});
export const out = (file, about, recipes) => {
  const d = new URL('./data/house-recipes/', import.meta.url);
  const ids = new Set(), titles = new Set();
  const M = new URL('file:///Users/lachlanoldfield/Developer/the-pantry-v2-b04-merge/scripts/data/house-recipes/');
  for (const dir of [d, M]) for (const f of readdirSync(dir)) { if (!/^batch-04/.test(f) || (dir === d && f === file)) continue; try { const j = JSON.parse(readFileSync(new URL(f, dir))); for (const r of (j.recipes || j)) { ids.add(r.id); titles.add(r.title.toLowerCase()); } } catch {} }
  const clash = recipes.filter(r => ids.has(r.id) || titles.has(r.title.toLowerCase())).map(r => r.id);
  if (clash.length) console.log('CLASH', clash.join(' '));
  writeFileSync(new URL(file, d), JSON.stringify({ about, recipes }, null, 1));
};
