// Consolidated, hand-verified allergen/diet offenders (certain) plus link fixes. Route filled from load.ts.
import { writeFileSync } from 'node:fs';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, routeOf, EV, csv } from './load.ts';
const ING = 'src/data/ingredients/ingredients.json (alias or group fix, then rebuild)';
// [slug, field, wrong, proof regex on a line or note, corrected, fix, sev]
const C: [string, string, string, RegExp, string, string][] = [
  ['marsala-trifle-cups', 'diets', 'vegetarian,no-gluten (sponge linked to vanilla-extract)', /sponge/i, 'drop no-gluten; vegetarian stays only if Marsala/sponge ok; link sponge to a cake ingredient with gluten+egg+dairy', 'line'],
  ['berry-trifle-cups', 'avoid groups', 'sponge linked to vanilla-extract (gluten, egg, dairy missed)', /sponge/i, 'link sponge cake to a cake/sponge ingredient (gluten, egg, dairy)', 'line'],
  ['chocolate-crackles', 'diets', 'no-gluten (puffed rice cereal -> white-rice)', /puffed rice/i, 'drop no-gluten (Rice Bubbles contain barley malt) or say gluten-free puffed rice', 'line'],
  ['honey-rice-bubble-bars', 'diets', 'no-gluten (puffed rice cereal -> white-rice)', /puffed rice|rice bubbles/i, 'drop no-gluten or say gluten-free puffed rice', 'line'],
  ['harira-chickpea-and-lentil-soup', 'diets', 'no-gluten (vermicelli -> rice-vermicelli)', /vermicelli/i, 'drop no-gluten; link wheat vermicelli to a wheat pasta id', 'line'],
  ['moroccan-spiced-lentil-harira-soup', 'diets', 'no-gluten (vermicelli -> rice-vermicelli)', /vermicelli/i, 'drop no-gluten', 'line'],
  ['sheer-khurma-eid-vermicelli-pudding', 'diets', 'no-gluten (seviyan -> rice-vermicelli)', /vermicelli/i, 'drop no-gluten', 'line'],
  ['feijoada', 'diets', 'no-dairy (farofa made with butter)', /farofa/i, 'drop no-dairy or make farofa with oil', 'line'],
  ['egg-kathi-roll-calcutta-style', 'diets', 'no-dairy (frozen parathas -> roti; own note says contains milk)', /paratha/i, 'drop no-dairy; link parathas to a paratha id with dairy+gluten', 'line'],
  ['fish-finger-wraps-for-kids-with-crunchy-slaw', 'diets', 'no-dairy (own note says contains milk)', /fish finger|wrap/i, 'drop no-dairy or fix the line that carries milk', 'line'],
  ['freezer-batch-minestrone', 'diets', 'vegan,no-gluten while note says add cooked pasta to serve', /pasta/i, 'drop no-gluten or make the pasta an optional line', 'line'],
  ['teriyaki-buri-glazed-yellowtail', 'avoid groups', 'kingfish steaks -> beef-steak (fish avoid misses; shopping list says beef)', /kingfish/i, 'add kingfish/yellowtail alias to a fish id', 'alias'],
  ['meen-varuthathu-kerala-fried-fish-with-rice', 'avoid groups', 'kingfish steaks -> beef-steak', /kingfish/i, 'add kingfish alias to a fish id', 'alias'],
  ['gluten-free-japanese-style-ginger-pork-with-rice', 'avoid groups', 'pork scotch fillet -> beef-rib-eye (pork avoid misses)', /pork scotch/i, 'add "pork scotch fillet" to a pork id', 'alias'],
  ['char-siu-cantonese-roast-pork-with-rice-and-greens', 'avoid groups', 'pork scotch fillet -> beef-rib-eye', /pork scotch|scotch/i, 'add "pork scotch fillet" to a pork id', 'alias'],
  ['bun-thit-nuong-vietnamese-grilled-pork-with-vermicelli', 'avoid groups', 'pork scotch fillet -> beef-rib-eye', /scotch/i, 'add "pork scotch fillet" to a pork id', 'alias'],
  ['crispy-tofu-and-greens-with-black-bean-sauce', 'diets+avoid', 'no-gluten via black bean sauce -> black-beans (soy, gluten missed)', /black bean/i, 'new black-bean-sauce id with soy+gluten; drop no-gluten', 'alias'],
  ['korean-jajangmyeon-black-bean-noodles', 'avoid groups', 'chunjang -> black-beans; own note says contains gluten and soy', /black bean/i, 'link to black-bean-paste id with soy+gluten', 'alias'],
  ['indonesian-gado-gado-with-peanut-sauce', 'text claim', 'summary says gluten-free; kecap manis has wheat', /kecap/i, 'reword or use gluten-free kecap', 'text'],
  ['mushroom-and-lentil-pie-with-sweet-potato-top', 'text claim', '"Vegan and gluten free." with soy sauce', /soy sauce/i, 'say tamari or drop the claim', 'text'],
  ['kalua-style-slow-pork-shoulder-with-rice', 'text claim', '"Gluten-free" with soy sauce', /soy sauce/i, 'say tamari or drop the claim', 'text'],
  ['massaman-sweet-potato-curry', 'text claim', '"Vegan" with curry paste containing shrimp paste', /curry paste/i, 'say vegan curry paste or drop the claim', 'text'],
  ['pumpkin-red-curry-with-rice', 'text claim', '"Vegan" with red curry paste (shrimp paste)', /curry paste/i, 'say vegan curry paste', 'text'],
  ['thai-sweet-corn-fritters-with-cucumber-dip', 'text claim', '"Vegetarian" with red curry paste (shrimp paste)', /curry paste/i, 'say vegetarian curry paste', 'text'],
  ['kimchi-cheese-toastie-rolls', 'text claim', '"Vegetarian" with kimchi (fish sauce / jeotgal)', /kimchi/i, 'say vegan kimchi', 'text'],
  ['crisp-kimchi-and-spring-onion-wedges', 'text claim', '"Vegetarian" with kimchi', /kimchi/i, 'say vegan kimchi', 'text'],
  ['lokma-honey-doughnut-bites', 'text claim', '"Vegan" with honey', /honey/i, 'drop the claim or use syrup', 'text'],
  ['vegan-mushroom-ragu-pappardelle', 'title claim', 'titled Vegan; pappardelle is egg pasta', /pappardelle/i, 'say egg-free pappardelle', 'text'],
];
const FIX: Record<string, (r: string) => string> = { line: (r) => r, alias: () => ING, text: (r) => r };
const rows: Record<string, string>[] = [];
for (const [slug, field, wrong, proof, corrected, kind] of C) {
  const r = recipes.find((x) => x.id === slug);
  if (!r) { rows.push({ slug, sourceFile: 'NOT FOUND', field, wrongValue: wrong, provingLine: '', correctedValue: corrected, fixRoute: '', provenance: '', certainty: 'certain' }); continue; }
  const route = routeOf(slug);
  const line = allLines(r).find((l) => proof.test(l.raw))?.raw ?? (r.notes ?? []).find((n) => proof.test(n)) ?? [r.title, r.summary ?? ''].find((t) => proof.test(t)) ?? '';
  rows.push({ slug, sourceFile: route, field, wrongValue: wrong, provingLine: line, correctedValue: corrected, fixRoute: kind === 'alias' ? `${ING}; recipe file ${route}` : route.includes('recipe-fixes') ? route : `${route} then rebuild (D-044)`, provenance: r.provenance ?? '', certainty: 'certain' });
}
console.log(rows.length, 'missing', rows.filter((r) => r.sourceFile === 'NOT FOUND').map((r) => r.slug), 'no proof', rows.filter((r) => !r.provingLine).map((r) => r.slug), 'reviewed', rows.filter((r) => r.provenance === 'reviewed').length);
writeFileSync(EV + 'allergen-offenders-certain.csv', csv(rows));
