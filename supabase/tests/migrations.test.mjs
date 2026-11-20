// The migrations folder is what `supabase db push` reads (supabase/APPLY-LIVE.md).
// Two files with one version make the push fail; a file parked in _pending is
// one nobody applies. No database needed.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));

test('every migration has its own 14-digit version', () => {
  for (const f of files) assert.match(f, /^\d{14}_[a-z0-9_]+\.sql$/, f);
  const versions = files.map((f) => f.slice(0, 14));
  const twice = versions.filter((v, i) => versions.indexOf(v) !== i);
  assert.deepEqual(twice, [], `versions used twice: ${twice.join(', ')}`);
});

test('nothing waits in _pending', () => {
  const pending = new URL('_pending/', dir);
  assert.deepEqual(existsSync(pending) ? readdirSync(pending) : [], []);
});

test('realtime_private_broadcast stays last (it is applied last, after a phone test)', () => {
  assert.match([...files].sort().at(-1), /_realtime_private_broadcast\.sql$/);
});
