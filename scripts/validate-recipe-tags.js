// Validates scripts/data/recipe-tags.json against the old app's RECIPES ids.
// Usage: node scripts/validate-recipe-tags.js [path/to/recipes.ts]
const fs = require('fs');
const path = require('path');

const tagsPath = path.join(__dirname, 'data', 'recipe-tags.json');
const recipesPath = process.argv[2] || '/home/claude/old-app/src/data/recipes.ts';

const CUISINES = ['italian','french','spanish','greek','turkish','middle-eastern','north-african','west-african','south-african','indian','thai','vietnamese','chinese','japanese','korean','malaysian','indonesian','filipino','mexican','latin-american','american','british','central-european','scandinavian','modern-australian'];
const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];
const SEASONS = ['spring','summer','autumn','winter'];
const HYPE = /\b(delicious|amazing|perfect)\b/i;
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️]/u;

const errors = [];
const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

// Ids from RECIPES: top-level keys of the form   'some-id': {
const src = fs.readFileSync(recipesPath, 'utf8');
const body = src.slice(src.indexOf('export const RECIPES'));
const recipeIds = [...body.matchAll(/^  '([a-z0-9-]+)': \{/gm)].map(m => m[1]);
if (recipeIds.length === 0) errors.push('No recipe ids parsed from ' + recipesPath);

const tagIds = Object.keys(tags);
for (const id of recipeIds) if (!(id in tags)) errors.push(`missing: ${id}`);
for (const id of tagIds) if (!recipeIds.includes(id)) errors.push(`extra (not in RECIPES): ${id}`);
const sorted = [...tagIds].sort();
if (tagIds.join() !== sorted.join()) errors.push('keys are not sorted alphabetically');

for (const [id, t] of Object.entries(tags)) {
  const allowedKeys = ['title','cuisine','mealTypes','onePot','seasons','summary'];
  for (const k of Object.keys(t)) if (!allowedKeys.includes(k)) errors.push(`${id}: unexpected key ${k}`);
  if (typeof t.title !== 'string' || !t.title.trim()) errors.push(`${id}: bad title`);
  if (!CUISINES.includes(t.cuisine)) errors.push(`${id}: bad cuisine ${t.cuisine}`);
  if (!Array.isArray(t.mealTypes) || t.mealTypes.length === 0) errors.push(`${id}: mealTypes empty`);
  else {
    for (const m of t.mealTypes) if (!MEAL_TYPES.includes(m)) errors.push(`${id}: bad mealType ${m}`);
    if (new Set(t.mealTypes).size !== t.mealTypes.length) errors.push(`${id}: duplicate mealTypes`);
  }
  if (typeof t.onePot !== 'boolean') errors.push(`${id}: onePot not boolean`);
  if ('seasons' in t) {
    if (!Array.isArray(t.seasons) || t.seasons.length === 0) errors.push(`${id}: seasons present but empty`);
    else for (const s of t.seasons) if (!SEASONS.includes(s)) errors.push(`${id}: bad season ${s}`);
  }
  const s = t.summary;
  if (typeof s !== 'string' || !s.trim()) errors.push(`${id}: missing summary`);
  else {
    if ([...s].length > 90) errors.push(`${id}: summary ${[...s].length} chars`);
    if (s.includes('!')) errors.push(`${id}: summary has '!'`);
    if (EMOJI.test(s)) errors.push(`${id}: summary has emoji`);
    if (HYPE.test(s)) errors.push(`${id}: summary has hype word`);
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`OK: ${tagIds.length} entries, all ${recipeIds.length} RECIPES ids present, all fields valid.`);
