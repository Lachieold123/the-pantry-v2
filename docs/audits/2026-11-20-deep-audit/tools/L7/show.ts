// Print selected columns of an evidence CSV: show.ts <file> <col,col> [filterCol=value] [limit]
import { readFileSync } from 'node:fs';
import { EV } from './load.ts';
const [file, cols, filter, limit] = process.argv.slice(2);
const text = readFileSync(EV + file!, 'utf8');
// minimal CSV parser
const rows: string[][] = [];
let row: string[] = [], cell = '', q = false;
for (let i = 0; i < text.length; i++) {
  const c = text[i]!;
  if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
  else if (c === '"') q = true;
  else if (c === ',') { row.push(cell); cell = ''; }
  else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
  else cell += c;
}
const head = rows.shift()!;
const idx = cols!.split(',').map((c) => head.indexOf(c));
let out = rows;
if (filter && filter !== '-') {
  for (const f of filter.split('&')) {
    const [k, v] = f.split('=');
    const i = head.indexOf(k!);
    out = out.filter((r) => (v!.startsWith('~') ? new RegExp(v!.slice(1)).test(r[i]!) : r[i] === v));
  }
}
console.log(out.length, 'rows');
for (const r of out.slice(0, Number(limit ?? 100))) console.log(idx.map((i) => r[i]).join(' | '));
