// Store builds show only cook-tested recipes (D-008), so a production build made
// before enough recipes are vetted ships an empty app, which App Review rejects.
// Run this before a production build:
//
//   VETTED_MIN=40 npm run catalogue:check-vetted
//
// It prints how many recipes are vetted and fails when that is below VETTED_MIN
// (1 when unset: zero vetted recipes is never shippable). Lachlan picks the real
// number; it is deliberately not an EAS build hook yet (see KNOWN-ISSUES K-14).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recipes = JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as { provenance?: string }[];

const raw = process.env.VETTED_MIN ?? '1';
const min = Number(raw);
if (!Number.isInteger(min) || min < 0) {
  console.error(`VETTED_MIN must be a whole number, not "${raw}".`);
  process.exit(2);
}

const vetted = recipes.filter((r) => r.provenance === 'vetted').length;
console.log(`${vetted} of ${recipes.length} recipes are vetted (a store build needs at least ${min}).`);
if (vetted < min) process.exitCode = 1;
