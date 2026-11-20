// Food safety over every recipe, by Australian guidance (FSANZ, Food Safety Information Council).
import { writeFileSync } from 'node:fs';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, byId, routeOf, EV, csv } from './load.ts';

const rows: Record<string, string>[] = [];
const add = (r: any, check: string, detail: string, certainty: string, fix: string) =>
  rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', check, detail: detail.slice(0, 220), certainty, correctedValue: fix });
const noteCount = new Map<string, number>();
const POULTRY_RAW = /\b(chicken|turkey|duck|quail|poussin|spatchcock)\b(?! stock| broth| fat| liver pâté| bouillon)/i;
const MINCE = /\b(mince|minced (beef|pork|lamb|chicken|turkey|meat)|sausages?|burgers?|patties|meatballs?|rissoles?|kofta|kofte|kebab mince)\b/i;
for (const r of recipes) {
  const lines = allLines(r);
  const raws = lines.map((l) => l.raw).join(' | ');
  const groups = new Set(lines.flatMap((l) => (l.ingredientId ? byId.get(l.ingredientId)?.groups ?? [] : [])));
  const steps = r.steps.map((s) => s.text).join(' ');
  const notes = (r.notes ?? []).join(' ');
  const all = `${r.title} ${r.summary ?? ''} ${steps} ${notes}`;
  const fs = (r.notes ?? []).filter((n) => /^food safety/i.test(n));
  for (const n of fs) noteCount.set(n, (noteCount.get(n) ?? 0) + 1);
  const temps = [...all.matchAll(/(\d{2,3})\s?°C/g)].map((m) => Number(m[1]));
  const internal = [...all.matchAll(/(?:internal|centre|center|thickest|reach(?:es)?|registers?|to at least|core)[^.]{0,40}?(\d{2})\s?°C|(\d{2})\s?°C[^.]{0,30}?(?:internal|in the centre|in the thickest|inside)/gi)].map((m) => Number(m[1] ?? m[2]));
  const rawPoultryLine = lines.find((l) => l.ingredientId && byId.get(l.ingredientId)?.groups.includes('poultry') && !['cooked-chicken', 'chicken-stock', 'duck-fat', 'pate'].includes(l.ingredientId) && !/\bcooked|leftover|roast(ed)? chicken|rotisserie|barbecued chicken|shredded\b/i.test(l.raw));
  const poultryByWord = lines.find((l) => POULTRY_RAW.test(l.item) && !/\b(cooked|leftover|rotisserie|barbecued|shredded|stock|egg)/i.test(l.raw));
  const poultry = rawPoultryLine ?? poultryByWord;
  if (poultry && !/7[5-9]\s?°C|8\d\s?°C/.test(all)) add(r, 'poultry-no-75C', `raw poultry "${poultry.raw}" but no 75°C anywhere`, rawPoultryLine ? 'certain' : 'review', 'add "Food safety: cook until the thickest part reaches 75°C and the juices run clear."');
  if (poultry && /\b(pink|medium-rare|rare)\b/i.test(steps) && !/not pink|no pink|no longer pink|isn't pink|without pink/i.test(steps)) add(r, 'poultry-pink', `poultry with "pink/rare" in steps: ${steps.match(/[^.]*\b(pink|medium-rare|rare)\b[^.]*/i)?.[0]}`, 'review', 'poultry must be cooked through (75°C)');
  const minceLine = lines.find((l) => MINCE.test(l.item) && (l.ingredientId ? (byId.get(l.ingredientId)?.groups ?? []).some((g) => ['meat', 'beef', 'pork', 'lamb', 'poultry'].includes(g)) : false) && !/\bcooked|leftover\b/i.test(l.raw));
  if (minceLine && !/7[5-9]\s?°C/.test(all)) add(r, 'mince-no-75C', `mince/sausage "${minceLine.raw}" but no 75°C`, 'certain', 'add "Food safety: cook mince and sausages to 75°C, no pink in the middle."');
  if (minceLine && /\b(medium-rare|medium rare|pink in the (middle|centre)|rare)\b/i.test(steps)) add(r, 'mince-rare', `mince cooked pink: ${steps.match(/[^.]*\b(medium-rare|medium rare|pink|rare)\b[^.]*/i)?.[0]}`, 'certain', 'cook mince/burgers through to 75°C');
  for (const t of internal) if (poultry && t < 74 && t > 40 && !groups.has('fish')) add(r, 'poultry-low-temp', `internal ${t}°C with poultry`, 'review', '75°C');
  if (/°F|fahrenheit/i.test(all)) add(r, 'fahrenheit', all.match(/[^.]*(°F|fahrenheit)[^.]*/i)![0], 'certain', 'Celsius only');
  if (/\b(fried rice|leftover rice|day-old rice|cold (cooked )?rice|cooked rice)\b/i.test(`${raws} ${steps} ${r.title}`) && !/(within (an|1|one|2|two) hours?|refrigerat|fridge)/i.test(all)) add(r, 'rice-cooling', 'cooked/leftover rice with no cool-and-refrigerate advice', 'certain', 'add "Food safety: cool cooked rice quickly and refrigerate within an hour; reheat until steaming hot (75°C) and only once."');
  if (/\b(leave|left|sit|stand)\b[^.]{0,40}\b(overnight|all day|on the bench|at room temperature)\b/i.test(steps) && /\b(rice|chicken|meat|egg|fish|dairy|milk|cream)\b/i.test(steps.match(/[^.]*\b(overnight|on the bench|room temperature)\b[^.]*/i)?.[0] ?? '') && !/fridge|refrigerat|covered in the fridge|chill/i.test(steps.match(/[^.]*\b(overnight|on the bench|room temperature)\b[^.]*/i)?.[0] ?? '')) add(r, 'room-temp-hold', steps.match(/[^.]*\b(overnight|on the bench|room temperature)\b[^.]*/i)![0], 'review', 'keep high-risk food out of 5-60°C; 2-hour/4-hour rule');
  const egg = groups.has('egg');
  const rawEgg = /\b(raw (egg|yolk)s?|uncooked egg|tiramisu|mousse|eggnog|steak tartare|homemade (mayonnaise|mayo|aioli)|runny yolk|jammy|soft-boiled|soft boiled|poached eggs?|sunny side|zabaglione|semifreddo|carbonara|hollandaise|béarnaise|bearnaise|caesar dressing|royal icing|meringue buttercream|egg nog)\b/i;
  if (egg && rawEgg.test(all) && !/pregnan|vulnerable|young children|elderly|immun|older people|pasteuri/i.test(all)) add(r, 'raw-egg-no-warning', `egg + "${all.match(rawEgg)![0]}" with no warning for vulnerable people`, /tiramisu|mousse|raw|uncooked|tartare|eggnog|homemade|zabaglione|semifreddo|hollandaise|caesar/i.test(all.match(rawEgg)![0]) ? 'certain' : 'review', 'add "Food safety: contains raw or lightly cooked egg; not for pregnant women, young children, older or immune-compromised people (use pasteurised eggs)."');
  const rawFish = /\b(sashimi|ceviche|tartare|crudo|poke|kokoda|ika mata|carpaccio|gravlax|cured salmon|raw (fish|tuna|salmon|oysters?|prawns?)|oysters? natural|kinilaw|hoe|tiradito|lomi)\b/i;
  if ((groups.has('fish') || groups.has('shellfish')) && rawFish.test(all) && !/pregnan|vulnerable|immun|young children/i.test(all)) add(r, 'raw-seafood-no-warning', `seafood + "${all.match(rawFish)![0]}" with no vulnerable-people warning`, 'review', 'add the raw seafood warning (sashimi-grade, very fresh, not for pregnant women, young children, older or immune-compromised people)');
  if (/\bhoney\b/i.test(raws) && /\b(baby|babies|infant|toddler|under (one|1|12 months)|months old|first foods?|weaning|6 months|from 6|8 months|9 months|10 months)\b/i.test(all) && !/12 months|one year|1 year|under (one|1)/i.test(all)) add(r, 'honey-infant', `honey in a recipe aimed at babies: ${all.match(/[^.]*\b(baby|babies|infant|toddler|months)\b[^.]*/i)?.[0]}`, 'certain', 'add "No honey for babies under 12 months (infant botulism)" or remove honey');
  if (/\b(raw|fresh) (bean )?sprouts\b|alfalfa sprouts|bean sprouts, to serve|raw bean sprouts/i.test(raws) && !/pregnan|vulnerable|rinse|blanch/i.test(all)) add(r, 'raw-sprouts', `raw sprouts: ${lines.find((l) => /sprout/i.test(l.raw))?.raw}`, 'review', 'note: raw sprouts are a listeria/salmonella risk for pregnant and vulnerable people; blanch for them');
  if (/\b(canning|water bath|preserv(e|ing) jars?|bottling|sterilis|sealed jars?|shelf-stable|store in the pantry)\b/i.test(all) && /\b(month|months|year|pantry|cupboard)\b/i.test(notes + steps) && !/fridge|refrigerat/i.test(notes + steps)) add(r, 'home-preserving', all.match(/[^.]*\b(canning|water bath|jars?|bottling|sterilis|pantry|cupboard)\b[^.]*/i)![0], 'review', 'home preserving needs tested method (acidity, processing time) or keep in the fridge');
  if (/garlic (in|infused) oil|herbs? in oil|chilli oil|confit garlic/i.test(`${raws} ${steps} ${r.title}`) && /\b(week|weeks|month|months|pantry|cupboard|room temperature)\b/i.test(notes + steps) && !/fridge|refrigerat/i.test(notes + steps)) add(r, 'garlic-in-oil', 'garlic/herbs in oil kept out of the fridge (botulism)', 'review', 'refrigerate and use within 4 days, or freeze');
  if (/slow cooker|crock ?pot/i.test(all) && /kidney beans/i.test(raws) && /dried|soaked/i.test(raws) && !/boil[^.]*(10|ten) min/i.test(all)) add(r, 'kidney-beans-slow-cooker', 'dried kidney beans in a slow cooker without a hard boil', 'certain', 'boil hard 10 minutes first');
  if (/kidney beans/i.test(raws) && /\bdried\b|soaked/i.test(raws) && !/boil[^.]*(10|ten) min|rapid(ly)? boil|hard boil|tinned|canned/i.test(all)) add(r, 'kidney-beans-no-boil', 'dried kidney beans without a 10-minute hard boil', 'certain', 'boil hard 10 minutes');
  if (/\breheat/i.test(all) && !/steaming|75\s?°C|piping hot|hot all the way|heated through|until hot/i.test(all) && groups.size) add(r, 'reheat-no-cue', all.match(/[^.]*\breheat[^.]*/i)![0], 'review', 'reheat until steaming hot (75°C) all the way through');
  if (/\b(pink|medium-rare|medium rare)\b/i.test(steps) && /\bpork\b/i.test(raws) && !/mince|sausage/i.test(raws) && !/7[0-5]\s?°C/.test(all)) add(r, 'pork-pink-no-temp', 'pork served pink without 70°C cue', 'review', 'whole pork cuts to 70°C');
  if (fs.some((n) => !/°C|opaque|flake|no pink|clear|steaming|cooked through|until|shells? open|refrigerat|fridge|within|pregnan|discard|boil/i.test(n))) add(r, 'boilerplate-safety-note', fs.find((n) => !/°C|opaque|flake|no pink|clear|steaming|cooked through|until|shells? open|refrigerat|fridge|within|pregnan|discard|boil/i.test(n))!, 'review', 'give a temperature or doneness cue');
  if (fs.some((n) => /food safety:\s*$/i.test(n.trim()) || n.trim().length < 20)) add(r, 'blank-safety-note', fs.join(' / '), 'certain', 'write the note');
  // Seafood with no food-safety at all, in converted recipes too
  const seafood = lines.find((l) => l.ingredientId && ['salmon', 'fresh-tuna', 'white-fish', 'calamari', 'clams', 'crab', 'lobster', 'mussels', 'octopus', 'prawn', 'scallops', 'whole-fish', 'mackerel', 'oyster'].includes(l.ingredientId));
  if (seafood && !/opaque|flake|63\s?°C|shells? (have |has )?open|cooked through|turn pink|pink and|firm|sashimi|raw/i.test(all)) add(r, 'seafood-no-cue', `seafood "${seafood.raw}" with no doneness cue`, 'review', 'add an opaque/flakes/shells-open cue');
}
const by = (k: string, rs = rows) => rs.reduce<Record<string, number>>((a, r) => ((a[r[k]!] = (a[r[k]!] ?? 0) + 1), a), {});
console.log('rows', rows.length, by('check'));
const cert = rows.filter((r) => r.certainty === 'certain');
console.log('certain', cert.length, by('check', cert), 'provenance', by('provenance', cert));
const seen = new Set<string>();
for (const r of rows) { const k = r.check; const n = [...seen].filter((x) => x.startsWith(k + '|')).length; if (n < 6) { seen.add(k + '|' + r.slug); console.log(` ${r.check} | ${r.certainty} | ${r.slug} [${r.provenance}] ${r.detail.slice(0, 150)}`); } }
const top = [...noteCount].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('distinct Food safety notes', noteCount.size, 'top:', top.map(([n, c]) => `${c}x "${n.slice(0, 90)}"`).join(' ;; '));
writeFileSync(EV + 'food-safety.csv', csv(rows));
