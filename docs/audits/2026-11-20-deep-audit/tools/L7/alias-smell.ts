// Aliases that look like matcher workarounds rather than names for the thing.
import { defs } from './load.ts';
const SMELL = /\b(with|for|in|or|and|soaked|mixed|plus|free|style|to serve|from)\b|-free|-style/;
const out: string[] = [];
for (const d of defs) for (const a of d.aliases) if (SMELL.test(a)) out.push(`${d.id}[${d.groups.join(',')}]: "${a}"`);
console.log(out.length);
console.log(out.join(' ; '));
