// safety-notes.ts [--list] : FOOD-4/5/6/18. For every catalogue recipe the food-safety check fails, writes one
// "Food safety: ..." note from the rules in docs/backups/feed-payloads-2026-10-17/fs_notes.py, keeping any real
// existing safety note's words. Batch recipes -> /tmp/l7-safety-edits.json (edit-batch.ts); converted ones ->
// /tmp/l7-safety-fixes.json (merge-fixes.ts). --list prints id | problems | new note instead.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
import { safetyProblems } from '../../../../../scripts/recipe-text-checks.mts';
import { all } from './batch-io.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const index = buildIngredientIndex(JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8')) as IngredientDef[]);
const inBatch = new Set([...all()].map(({ h }) => h.id as string));
const list = process.argv.includes('--list');

const VULN = 'pregnant women, older people, young children and anyone with low immunity';
const edits: Record<string, unknown> = {};
const fixes: Record<string, unknown> = {};
const tally: Record<string, number> = {};
let skipped = 0;
for (const r of recipes) {
  const lines = allLines(r).filter((l) => !l.optional);
  const p = safetyProblems({
    ids: new Set(lines.flatMap((l) => (l.ingredientId ? [l.ingredientId] : []))),
    isPoultry: (id) => index.byId.get(id)?.groups.includes('poultry') ?? false,
    lineText: lines.map((l) => l.raw.replace(/\(([^)]*)\)/g, ' ')).join(' | '),
    title: r.title,
    summary: r.summary ?? '',
    steps: r.steps.map((s) => s.text),
    notes: r.notes ?? [],
  });
  if (!p.length) continue;
  const items = lines.map((l) => l.raw).join(' | ').toLowerCase();
  const method = [...r.steps.map((s) => s.text), ...(r.notes ?? [])].join(' ');
  const has = (re: RegExp) => re.test(items);
  const why = (s: string) => p.some((x) => x.startsWith(s));
  const out: string[] = [];
  if (why('a step or note says')) { skipped++; console.log('HAND', r.id); continue; }
  if (why('raw poultry'))
    out.push(`Cook ${has(/chicken/) ? 'chicken' : 'poultry'} until the thickest part reaches 75°C and the juices run clear, with no pink meat near the bone.`);
  if (why('mince or sausage')) out.push('Cook mince, sausages, meatballs and liver right through to 75°C, with no pink in the centre.');
  if (why('fresh pork')) out.push('Cook fresh pork until the centre reaches 70°C and the juices run clear.');
  if (why('beef, lamb or veal cut')) {
    const slow = /\b(braise|stew|slow[- ]cook|simmer[^.]{0,60}\b(hour|[4-9]\d minutes)|\b\d+(\.\d+)? hours?\b|\bhangi\b)/i.test(method);
    out.push(slow
      ? 'Slow-cooked meat is safe once it is tender and the centre has reached at least 75°C.'
      : 'Cook whole cuts of beef, lamb and veal to at least 63°C in the thickest part, then rest for 3 minutes; cook rolled or stuffed cuts to 75°C.');
  }
  if (why('raw seafood:')) {
    const fish = has(/salmon|tuna|fish|kingfish|snapper|barramundi|cod|trout|mackerel|whiting|flathead|bream|ling|basa|hake|perch|swordfish|sardine/);
    if (fish) out.push('Cook fish until it turns opaque and flakes easily, about 63°C in the thickest part.');
    if (has(/mussel|clam|pipi|cockle/)) out.push('Cook mussels and clams only if they are alive and tightly closed (or close when tapped), and throw out any that stay shut after cooking.');
    if (has(/prawn|shrimp|crab|lobster|crayfish|bug/)) out.push('Cook prawns and other shellfish until the shells turn pink and the flesh is opaque and firm.');
    if (has(/squid|calamari|octopus|scallop|cuttlefish/)) out.push('Cook squid, octopus and scallops until opaque and just firm, and keep seafood chilled until you cook it.');
    if (!fish && !has(/mussel|clam|pipi|cockle|prawn|shrimp|crab|lobster|crayfish|bug|squid|calamari|octopus|scallop|cuttlefish/))
      out.push('Cook seafood until it is opaque and flakes or firms up, about 63°C in the thickest part.');
  }
  if (why('raw or lightly cured seafood'))
    out.push(`Use very fresh, well-chilled seafood for anything served raw or lightly cured, and serve it straight away; ${VULN} should avoid raw fish.`);
  if (why('raw or soft egg')) {
    const raw = /\b(raw (egg|yolk)s?|uncooked egg|eggnog|tiramisu|mousse|homemade (mayonnaise|mayo|aioli)|hollandaise|zabaglione)\b/i.test(method);
    out.push(raw
      ? `This uses raw or lightly cooked egg: ${VULN} should skip it or use pasteurised eggs.`
      : `Use fresh, uncracked eggs; for ${VULN}, cook the eggs until the yolks are firm.`);
  }
  if (why('cooked rice')) out.push('Cool cooked rice quickly, refrigerate it within 1 hour and reheat it until steaming hot.');
  if (why('dried kidney beans')) out.push('Soak dried kidney beans, then boil them hard for at least 10 minutes before simmering.');
  if (why('honey in a dish for babies')) out.push('Honey is not safe for babies under 12 months.');
  if (why('garlic or chilli in oil')) out.push('Keep any leftover garlic, herb or chilli oil in the fridge and use it within 4 days.');
  if (why('reheating')) out.push('Reheat leftovers until steaming hot right through.');
  // Only an empty note was wrong: write the default for the dish.
  if (!out.length && why('the "Food safety" note says nothing'))
    out.push(has(/rice|pasta|noodle|lentil|bean|chickpea|quinoa|couscous|risotto|spaghetti|penne|macaroni/)
      ? 'Cooked rice, pasta and legumes spoil quickly: cool leftovers fast, refrigerate within 1 hour, eat within 2 days and reheat until steaming hot.'
      : 'Wash fresh produce well, refrigerate leftovers within 2 hours and eat them within 3 days.');
  if (!out.length) { skipped++; console.log('NONE', r.id, p.join('; ')); continue; }
  for (const x of p) { const k = x.replace(/:.*/, ''); tally[k] = (tally[k] ?? 0) + 1; }
  // Keep a real existing safety note's words, then add what it lacks.
  const old = (r.notes ?? []).filter((n) => /^Food safety/.test(n));
  const kept = old.map((n) => n.replace(/^Food safety:?\s*/, '').trim()).filter((b) => b.length > 3 && !/^be careful\.?$/i.test(b));
  const body = [...kept, ...out].map((s) => (/[.!]$/.test(s) ? s : `${s}.`)).join(' ');
  const note = `Food safety: ${body}`;
  if (list) { console.log(`${r.id} | ${p.map((x) => x.replace(/:.*/, '')).join(', ')} | ${note}`); continue; }
  const e = { dropNotes: old, addNotes: [note] };
  if (inBatch.has(r.id)) edits[r.id] = e;
  else fixes[r.id] = old.length ? e : { addNotes: [note] };
}
if (!list) {
  writeFileSync('/tmp/l7-safety-edits.json', JSON.stringify(edits, null, 1));
  writeFileSync('/tmp/l7-safety-fixes.json', JSON.stringify(fixes, null, 1));
}
console.log(JSON.stringify(tally));
console.log({ batch: Object.keys(edits).length, converted: Object.keys(fixes).length, skipped });
