// certain-check.ts : the lane's 28 "certain" offenders (tools/L7/offenders.ts) now: diets, the proving line's link + groups,
// and any title/summary/note sentence that still makes a diet claim. Prints one short block per recipe.
import { readFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const index = buildIngredientIndex(JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8')) as IngredientDef[]);
const src = readFileSync(ROOT + 'docs/audits/2026-11-20-deep-audit/tools/L7/offenders.ts', 'utf8');
const C = [...src.matchAll(/^\s*\['([a-z0-9-]+)', '[^']*', '[^']*', \/(.+?)\/i,/gm)].map((m) => [m[1]!, new RegExp(m[2]!, 'i')] as const);
for (const [slug, proof] of C) {
  const r = recipes.find((x) => x.id === slug);
  if (!r) { console.log(slug, 'NOT FOUND'); continue; }
  const l = allLines(r).find((x) => proof.test(x.raw));
  const link = l ? `${l.raw} -> ${l.ingredientId} [${index.byId.get(l.ingredientId ?? '')?.groups.join(',') ?? ''}]${l.optional ? ' (optional)' : ''}` : '(no line)';
  const claims = [r.title, r.summary ?? '', ...(r.notes ?? [])].flatMap((t) => t.split(/(?<=[.;])\s+/)).filter((s) => /vegan|vegetarian|gluten|dairy-free|egg-free/i.test(s));
  console.log(`${slug} | ${r.diets.join(',')} | ${link} | ${claims.join(' / ').slice(0, 200)}`);
}
