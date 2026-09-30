// Every test file must be picked up by one of the two runners. Without this, a
// test in a folder neither runner's glob covers is silently never run, and a
// green `npm test` would be lying.
//
//   node:test (npm run test:domain) runs *.test.ts and scripts/*.test.mts;
//   Jest (npm run test:ui) runs *.test.tsx.
//
// The globs are read from package.json and jest.config.js, so this stays true
// when either runner's configuration changes.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, matchesGlob, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
const nodeGlobs = [...(pkg.scripts['test:domain'] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
const jestConfig = require(join(root, 'jest.config.js')) as { testMatch?: string[] };
const jestGlobs = (jestConfig.testMatch ?? []).map((g) => g.replace('<rootDir>/', ''));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
    const path = join(dir, e.name);
    return e.isDirectory() ? walk(path) : [path];
  });
}

const testFiles = ['src', 'scripts']
  .flatMap((d) => walk(join(root, d)))
  .map((p) => relative(root, p))
  .filter((p) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p));

const matchedBy = (file: string, globs: string[]) => globs.some((g) => matchesGlob(file, g));
const orphans = testFiles.filter((f) => !matchedBy(f, nodeGlobs) && !matchedBy(f, jestGlobs));
const twice = testFiles.filter((f) => matchedBy(f, nodeGlobs) && matchedBy(f, jestGlobs));

if (nodeGlobs.length === 0 || jestGlobs.length === 0) {
  console.error('Could not read the test globs from package.json (test:domain) or jest.config.js (testMatch).');
  process.exit(1);
}
for (const f of orphans) console.error(`Not run by any test runner: ${f}`);
for (const f of twice) console.error(`Run by both test runners: ${f}`);
if (orphans.length || twice.length) process.exit(1);
console.log(`${testFiles.length} test files, each run by exactly one runner.`);
