// Read and write a house batch file in its own layout, refusing a file that wouldn't round-trip.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
export const ROOT = new URL('../../../../../', import.meta.url).pathname;
export const DIR = ROOT + 'scripts/data/house-recipes/';
export const files = () => readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => DIR + f);

// Some batches were written with arrays of plain values on one line.
function inline(v: unknown, ind: number, depth = 0): string {
  const pad = (d: number) => ' '.repeat(ind * d);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every((x) => x === null || typeof x !== 'object')) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
    return `[\n${v.map((x) => pad(depth + 1) + inline(x, ind, depth + 1)).join(',\n')}\n${pad(depth)}]`;
  }
  if (v && typeof v === 'object') {
    const e = Object.entries(v);
    if (!e.length) return '{}';
    return `{\n${e.map(([k, x]) => `${pad(depth + 1)}${JSON.stringify(k)}: ${inline(x, ind, depth + 1)}`).join(',\n')}\n${pad(depth)}}`;
  }
  return JSON.stringify(v);
}
const layouts = [
  (d: unknown, ind: number) => JSON.stringify(d, null, ind),
  (d: unknown, ind: number) => inline(d, ind),
];
export function read(file: string): { data: any; save: () => void } {
  const raw = readFileSync(file, 'utf8');
  const bom = raw.startsWith('﻿') ? '﻿' : '';
  const s = raw.slice(bom.length);
  const ind = /\n( +)"/.exec(s)?.[1]?.length ?? 2;
  const nl = s.endsWith('\n') ? '\n' : '';
  const data = JSON.parse(s);
  const lay = layouts.find((f) => bom + f(data, ind) + nl === raw);
  if (!lay) throw new Error('does not round-trip: ' + file);
  return { data, save: () => writeFileSync(file, bom + lay(data, ind) + nl) };
}
/** Every batch recipe, with the file it lives in; call save() on the files you changed. */
export function all() {
  const out: { file: string; h: any; batch: ReturnType<typeof read> }[] = [];
  for (const f of files()) {
    const b = read(f);
    for (const h of b.data.recipes) out.push({ file: f, h, batch: b });
  }
  return out;
}
