// safety-notes.ts [--list] : FOOD-4/5/6/18. For every catalogue recipe the food-safety check fails, writes one
// "Food safety: ..." note from the rules in docs/backups/feed-payloads-2026-10-17/fs_notes.py, keeping any real
// existing safety note's words. Batch recipes -> /tmp/l7-safety-edits.json (edit-batch.ts); converted ones ->
// /tmp/l7-safety-fixes.json (merge-fixes.ts). --list prints id | problems | new note instead.
// --live (FOOD-16): runs over the 719 live feed rows as of 17 Oct (the published_recipes backup, overlaid with the
// update and insert payloads and the compact note updates) and writes FIX-L7-LIVE.sql instead: one statement per row
// that adds the missing safety note, or removes a diet tag the checked catalogue copy of the same recipe has lost
// because of a line the live row also has.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type DietTag, type Recipe } from '../../../../../src/domain/recipes/types.ts';
import { safetyProblems } from '../../../../../scripts/recipe-text-checks.mts';
import { all } from './batch-io.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const live = process.argv.includes('--live');
const PAY = ROOT + 'docs/backups/feed-payloads-2026-10-17/';
type Row = { id?: string; slug?: string; title?: string; notes?: string[]; diets?: DietTag[]; recipe: Recipe };
const rowsOf = (f: string): Row[] => JSON.parse(readFileSync(PAY + f, 'utf8'));
const catalogue: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const liveRows: Row[] = [];
if (live) {
  const byId = new Map<string, Row>(
    (JSON.parse(readFileSync(ROOT + 'docs/backups/supabase-2026-10-17/published_recipes.json', 'utf8')) as Row[]).map((r) => [r.id!, r]),
  );
  for (const u of rowsOf('feed-updates.json')) byId.set(u.id!, { ...byId.get(u.id!), ...u });
  const compact = new Map(rowsOf('feed-compact-updates.json').map((r) => [r.id ?? '', r.notes]));
  liveRows.push(...byId.values(), ...rowsOf('feed-inserts.json'));
  for (const r of liveRows) {
    const notes = (compact.get(r.id ?? '') ?? r.recipe.notes ?? []).filter((n) => n.trim() !== 'Food safety:');
    r.recipe = { ...r.recipe, notes, diets: r.diets ?? r.recipe.diets };
  }
}
// The live row's key: its uuid, or its unique slug for inserts (their uuid was made by the database).
const keyOf = new Map<Recipe, string>(liveRows.map((r) => [r.recipe, r.id ? `id = '${r.id}'` : `slug = '${r.slug}'`]));
const slugOf = new Map<Recipe, string>(liveRows.map((r) => [r.recipe, r.slug ?? r.recipe.id]));
const recipes: Recipe[] = live ? liveRows.map((r) => r.recipe) : catalogue;
const sql: string[] = [];
const q = (s: string) => s.replace(/'/g, "''");
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
  if (live) {
    // Live: add only, so a new note with just the missing sentences; an existing note stays as it is.
    const add = `Food safety: ${out.map((s) => (/[.!]$/.test(s) ? s : `${s}.`)).join(' ')}`;
    const where = `where ${keyOf.get(r)}`;
    // The proof: the recipe's own line or step that needs the note.
    const PROOF: [string, RegExp][] = [['reheat', /reheat/i], ['mince', /mince|sausage|meatball|liver/i], ['fresh pork', /pork/i],
      ['raw poultry', /chicken|duck|turkey|quail|rabbit|poultry/i], ['garlic', /oil/i], ['raw or soft egg', /egg|yolk/i],
      ['cooked rice', /rice/i], ['raw seafood', /fish|prawn|squid|mussel|clam|salmon|tuna/i], ['beef', /beef|lamb|veal/i]];
    const texts = [...lines.map((l) => l.raw), ...r.steps.map((s) => s.text), ...(r.notes ?? [])];
    const proofs = p.map((x) => {
      const re = PROOF.find(([k]) => x.startsWith(k))?.[1];
      const t = re && texts.find((s) => re.test(s));
      return t ? `"${t.slice(0, 90)}${t.length > 90 ? '...' : ''}"` : x;
    });
    sql.push(
      `-- ${r.title}: ${[...new Set(p.map((x) => x.replace(/:.*/, '')))].join(', ')}. Proof: ${q([...new Set(proofs)].join('; ')).replace(/\n/g, ' ')}`,
      `update public.published_recipes set recipe = jsonb_set(recipe, '{notes}', coalesce(recipe->'notes', '[]'::jsonb) || to_jsonb('${q(add)}'::text)) ${where} and not coalesce(recipe->'notes', '[]'::jsonb) @> jsonb_build_array('${q(add)}'::text);`,
      `-- undo: update public.published_recipes set recipe = jsonb_set(recipe, '{notes}', coalesce((select jsonb_agg(n) from jsonb_array_elements(recipe->'notes') n where n #>> '{}' <> '${q(add)}'), '[]'::jsonb)) ${where};`,
      '',
    );
    continue;
  }
  const e = { dropNotes: old, addNotes: [note] };
  if (inBatch.has(r.id)) edits[r.id] = e;
  else fixes[r.id] = old.length ? e : { addNotes: [note] };
}
if (live) {
  // Diet tags: the catalogue copy (derived from its lines, all FOOD fixes in) has lost the tag, and the counted line
  // that breaks it is in the live row word for word.
  const BREAK: Record<string, string[]> = {
    vegetarian: ['meat', 'beef', 'pork', 'lamb', 'poultry', 'fish', 'shellfish', 'non-vegetarian'],
    vegan: ['meat', 'beef', 'pork', 'lamb', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'animal-product', 'non-vegetarian'],
    pescatarian: ['meat', 'beef', 'pork', 'lamb', 'poultry'],
    'no-gluten': ['gluten'],
    'no-dairy': ['dairy'],
  };
  const cat = new Map(catalogue.map((c) => [c.id, c]));
  const diet: string[] = [];
  const noCopy: string[] = [];
  for (const r of recipes) {
    const c = cat.get(slugOf.get(r)!);
    if (!c) { noCopy.push(slugOf.get(r)!); continue; }
    const liveRaw = new Set(allLines(r).filter((l) => !l.optional).map((l) => l.raw.trim()));
    for (const tag of r.diets.filter((t) => !c.diets.includes(t))) {
      const proof = allLines(c).find((l) => !l.optional && l.ingredientId && liveRaw.has(l.raw.trim())
        && (index.byId.get(l.ingredientId)?.groups ?? []).some((g) => BREAK[tag]?.includes(g)));
      if (!proof) {
        const brk = allLines(c).filter((l) => !l.optional && l.ingredientId && (index.byId.get(l.ingredientId)?.groups ?? []).some((g) => BREAK[tag]?.includes(g)));
        console.log('DIET-NO-PROOF', slugOf.get(r), tag, '| catalogue:', brk.map((l) => l.raw).join(' ; ').slice(0, 200));
        continue;
      }
      const p = `tagged ${tag}, but "${proof.raw}" is ${proof.ingredientId} (${index.byId.get(proof.ingredientId!)!.groups.join(', ')})`;
      const where = `where ${keyOf.get(r)}`;
      diet.push(
        `-- ${r.title}: ${q(p).slice(0, 200)}`,
        `update public.published_recipes set diets = array_remove(diets, '${tag}'), recipe = jsonb_set(recipe, '{diets}', coalesce((select jsonb_agg(d) from jsonb_array_elements(recipe->'diets') d where d #>> '{}' <> '${tag}'), '[]'::jsonb)) ${where} and '${tag}' = any(diets);`,
        `-- undo: update public.published_recipes set diets = array_append(diets, '${tag}'), recipe = jsonb_set(recipe, '{diets}', (recipe->'diets') || '["${tag}"]'::jsonb) ${where};`,
        '',
      );
    }
  }
  const head = [
    '-- FIX-L7-LIVE.sql (FOOD-16, deep audit 20 Nov 2026). NOT RUN. For the owner to review and run on the-pantry\'s live database.',
    `-- Built offline by tools/FIX-L7/safety-notes.ts --live over the ${recipes.length} live rows as of 17 Oct: the published_recipes backup`,
    '-- overlaid with the update and insert payloads, their compact note updates and the 24 Oct vegan fixes. Rows edited after',
    '-- that are not seen, so look at a row before running its statement if it may have changed.',
    '-- Each statement only removes a wrong diet tag or adds a missing "Food safety" note. Each is keyed by the row id (or the',
    '-- unique slug for rows inserted from feed-inserts.json, whose id the database made) and does nothing if already done.',
    '-- The undo for each is the comment under it. Diet tags come off only where the checked catalogue copy of the same recipe',
    `-- has lost the tag and the line that breaks it is in the live row word for word; ${noCopy.length} live rows have no catalogue copy`,
    '-- and get the safety check only.',
    '',
    '-- Pasta e Lenticchie: Parmesan is made with animal rennet (D-053), so it is not vegetarian (24 Oct kept the tag).',
    "update public.published_recipes set diets = array_remove(diets, 'vegetarian'), recipe = jsonb_set(recipe, '{diets}', coalesce((select jsonb_agg(d) from jsonb_array_elements(recipe->'diets') d where d #>> '{}' <> 'vegetarian'), '[]'::jsonb)) where id = 'fcc4ff98-09d0-4068-9c82-add53a836973' and 'vegetarian' = any(diets);",
    "-- undo: update public.published_recipes set diets = array_append(diets, 'vegetarian'), recipe = jsonb_set(recipe, '{diets}', (recipe->'diets') || '[\"vegetarian\"]'::jsonb) where id = 'fcc4ff98-09d0-4068-9c82-add53a836973';",
    '',
    '-- Pasta e Fagioli (id from the 17 Oct backup): its only Parmesan is "1 parmesan rind (optional)", and optional lines do not',
    '-- count, so it stays vegetarian. Owner call: run this only if an optional rennet cheese should cost the tag.',
    "-- update public.published_recipes set diets = array_remove(diets, 'vegetarian'), recipe = jsonb_set(recipe, '{diets}', coalesce((select jsonb_agg(d) from jsonb_array_elements(recipe->'diets') d where d #>> '{}' <> 'vegetarian'), '[]'::jsonb)) where id = 'e41dc0af-b04b-46c3-a247-af994654e44d' and title = 'Pasta e Fagioli' and 'vegetarian' = any(diets);",
    '',
    '-- ===== Diet tags =====',
    '',
  ];
  writeFileSync(ROOT + 'docs/audits/2026-11-20-deep-audit/FIX-L7-LIVE.sql', [...head, ...diet, '-- ===== Food safety notes =====', '', ...sql].join('\n'));
  console.log({ dietStatements: diet.length / 4, noteStatements: sql.length / 4 });
} else if (!list) {
  writeFileSync('/tmp/l7-safety-edits.json', JSON.stringify(edits, null, 1));
  writeFileSync('/tmp/l7-safety-fixes.json', JSON.stringify(fixes, null, 1));
}
console.log(JSON.stringify(tally));
console.log({ batch: Object.keys(edits).length, converted: Object.keys(fixes).length, skipped });
