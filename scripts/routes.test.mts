// Every literal route in the app must be a real screen. Expo Router's typed
// routes would catch a typo, but their types are generated into .expo/, which
// is gitignored, so CI and a fresh checkout typecheck against nothing (audit
// F183). This checks the same thing from the files themselves.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'src/app');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

/** The URL each route file answers, as segments: `(tabs)/index.tsx` is `/`, `recipe/[id]/plan.tsx` is `/recipe/[id]/plan`. */
function routeOf(file: string): string[] | undefined {
  const name = relative(appDir, file).replace(/\.tsx?$/, '');
  const parts = name.split('/');
  const last = parts[parts.length - 1] ?? '';
  // Layouts and special files (+not-found, +html) aren't places you can link to.
  if (last === '_layout' || last.startsWith('+')) return undefined;
  return parts.filter((p) => !/^\(.*\)$/.test(p) && p !== 'index');
}

const routes = walk(appDir)
  .filter((f) => /\.tsx?$/.test(f))
  .map(routeOf)
  .filter((r): r is string[] => r !== undefined);

const isDynamic = (segment: string) => /^\[.+\]$/.test(segment);

/** An href matches a route if every segment is equal, or the route's segment is dynamic. */
function matches(href: string, route: readonly string[]): boolean {
  const path = href.split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  return segments.length === route.length && segments.every((s, i) => s === route[i] || isDynamic(route[i] ?? ''));
}

// A route-shaped string literal: "/", "/plan", "/recipe/[id]/cook". Anything else starting
// with "/" (a regex, a URL path in parsing code) doesn't look like this.
const ROUTE_LITERAL = /['"`](\/(?:[a-z0-9-]+|\[[a-zA-Z]+\])?(?:\/(?:[a-z0-9-]+|\[[a-zA-Z]+\]))*)['"`]/g;

const sources = ['app', 'features', 'lib', 'store', 'ui']
  .flatMap((d) => walk(join(root, 'src', d)))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

const hrefs = sources.flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(ROUTE_LITERAL)].map((m) => ({ file: relative(root, file), href: m[1] as string })),
);

describe('literal routes', () => {
  it('finds the app’s routes and the links to them', () => {
    // Guards the test itself: if either scan found nothing, the check below would pass vacuously.
    assert.ok(routes.length >= 20, `found only ${routes.length} routes`);
    assert.ok(hrefs.length >= 30, `found only ${hrefs.length} links`);
  });
  it('every literal href in src is a screen under src/app', () => {
    const broken = hrefs.filter(({ href }) => !routes.some((r) => matches(href, r))).map(({ file, href }) => `${file}: ${href}`);
    assert.deepEqual(broken, []);
  });
  it('the matcher rejects a typo and accepts a dynamic segment', () => {
    assert.ok(matches('/recipe/[id]/cook', ['recipe', '[id]', 'cook']));
    assert.ok(matches('/recipe/carbonara', ['recipe', '[id]']));
    assert.ok(!routes.some((r) => matches('/recipes/[id]', r)));
    assert.ok(!routes.some((r) => matches('/setting', r)));
  });
});
