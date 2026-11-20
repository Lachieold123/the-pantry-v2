// rt.ts [--write] : batch files that don't round-trip through JSON.stringify(2-space indent, trailing newline); --write normalises them.
import { readFileSync, writeFileSync } from 'node:fs';
import { files } from './batch-io.ts';
for (const f of files()) {
  const s = readFileSync(f, 'utf8');
  const ind = /\n( +)"/.exec(s)?.[1]?.length ?? 2;
  if (`${JSON.stringify(JSON.parse(s), null, ind)}\n` === s) continue;
  console.log(f.split('/').pop());
  if (process.argv[2] === '--write') writeFileSync(f, `${JSON.stringify(JSON.parse(s.replace(/^﻿/, '')), null, 2)}\n`);
}
