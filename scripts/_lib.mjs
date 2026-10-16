import { writeFileSync } from 'node:fs';
export const R = (id, title, summary, cuisine, difficulty, prepMinutes, cookMinutes, servings, onePot, ings, steps, notes, n) => ({
  id, title, summary, cuisine, mealTypes: ['lunch'], difficulty, prepMinutes, cookMinutes, servings, onePot, diets: [],
  ingredients: [{ items: ings }], steps, notes,
  nutrition: { kcal: n[0], proteinG: n[1], carbsG: n[2], fatG: n[3], fibreG: n[4], sodiumMg: n[5] },
});
export const out = (file, about, recipes) => writeFileSync(new URL('./data/house-recipes/' + file, import.meta.url), JSON.stringify({ about, recipes }, null, 1));
