// edit-batch.ts <edits.json> : applies text edits to house batch recipes. Each "from" must hit exactly one string, or it's reported and skipped.
// { "<id>": { "replace": [{ "in": "title|summary|items|steps|notes", "from": "...", "to": "..." }],
//             "addItems": [{ "group": 0, "line": "..." }], "addNotes": ["..."], "dropNotes": ["exact note"], "diets": [..] } }
import { readFileSync } from 'node:fs';
import { all } from './batch-io.ts';
type Edit = {
  replace?: { in: 'title' | 'summary' | 'items' | 'steps' | 'notes'; from: string; to: string }[];
  addItems?: { group: number; line: string }[];
  addNotes?: string[];
  dropNotes?: string[];
  diets?: string[];
};
const edits: Record<string, Edit> = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
const seen = new Set<string>();
const dirty = new Set<any>();
const problems: string[] = [];
let n = 0;
for (const { h, batch } of all()) {
  const e = edits[h.id];
  if (!e) continue;
  seen.add(h.id);
  for (const r of e.replace ?? []) {
    // "text": whichever of title, summary or notes holds it (exactly one).
    if ((r.in as string) === 'text') {
      const where = (['title', 'summary'] as const).filter((f) => h[f]?.includes(r.from));
      const notes = (h.notes ?? []).filter((t: string) => t.includes(r.from)).length;
      if (where.length + notes !== 1) { problems.push(`${h.id}: text "${r.from}" matched ${where.length + notes}`); continue; }
      r.in = where[0] ?? 'notes';
    }
    if (r.in === 'title' || r.in === 'summary') {
      if (!h[r.in]?.includes(r.from)) { problems.push(`${h.id}: ${r.in} has no "${r.from}"`); continue; }
      h[r.in] = h[r.in].replace(r.from, r.to);
      n++;
      continue;
    }
    const lists: string[][] = r.in === 'items' ? h.ingredients.map((g: any) => g.items) : [(h[r.in] ??= [])];
    const hits = lists.flatMap((l, li) => l.map((t, ti) => [li, ti, t] as const)).filter(([, , t]) => t.includes(r.from));
    if (hits.length !== 1) { problems.push(`${h.id}: ${r.in} "${r.from}" matched ${hits.length}`); continue; }
    const [li, ti, t] = hits[0]!;
    lists[li]![ti] = t.replace(r.from, r.to);
    n++;
  }
  for (const a of e.addItems ?? []) if (!h.ingredients[a.group].items.includes(a.line)) (h.ingredients[a.group].items.push(a.line), n++);
  for (const a of e.addNotes ?? []) if (!(h.notes ??= []).includes(a)) (h.notes.push(a), n++);
  for (const d of e.dropNotes ?? []) {
    const i = (h.notes ?? []).indexOf(d);
    if (i < 0) problems.push(`${h.id}: no note "${d}"`);
    else (h.notes.splice(i, 1), n++);
  }
  if (e.diets) (h.diets = e.diets, n++);
  dirty.add(batch);
}
for (const id of Object.keys(edits)) if (!seen.has(id)) problems.push(`${id}: not in any batch`);
for (const b of dirty) b.save();
console.log(n, 'edits;', problems.length, 'problems');
for (const p of problems) console.log('  ✗ ' + p);
