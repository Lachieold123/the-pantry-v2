import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, chunkRows, diffLive, dietConflicts, parseLive, stepsMd5, type Inputs } from './verify-feed-payload.mts';

const steps = [{ text: 'Boil.', n: 1 }];
const group = (item: string) => [{ items: [{ item }] }];
const chunkSql = (rows: unknown[]) =>
  `with d as (select value r from jsonb_array_elements($q$${JSON.stringify(rows)}$q$::jsonb)) select 1;`;

function fixture(): Inputs {
  const full = [
    { id: 'a', title: 'A', diets: ['vegetarian'], recipe: { steps, notes: ['ok'], ingredientGroups: group('Cheddar') } },
    { id: 'b', title: 'B', diets: [], recipe: { steps, notes: [], ingredientGroups: group('Pork') } },
  ];
  const compact = [{ id: 'a', notes: ['ok'], steps }];
  const inserts = [{ slug: 'new-one', diets: ['vegan'], recipe: { steps, notes: [], ingredientGroups: group('Rice') } }];
  return {
    full: full as never,
    compact: compact as never,
    inserts: inserts as never,
    chunks: { u01: compact, i01: inserts } as never,
  };
}

test('stepsMd5 ignores key order', () => {
  assert.equal(stepsMd5([{ a: 1, b: 2 }]), stepsMd5([{ b: 2, a: 1 }]));
  assert.notEqual(stepsMd5([{ a: 1 }]), stepsMd5([{ a: 2 }]));
});

test('chunkRows reads the $q$ block', () => {
  assert.deepEqual(chunkRows(chunkSql([{ id: 'x' }])), [{ id: 'x' }]);
  assert.throws(() => chunkRows('select 1'));
});

test('dietConflicts: vegetarian blocks parmesan, vegan also blocks honey', () => {
  const r = { ingredientGroups: group('Honey') };
  assert.deepEqual(dietConflicts(['vegetarian'], r), []);
  assert.deepEqual(dietConflicts(['vegan'], r), ['honey']);
  assert.deepEqual(dietConflicts(['vegetarian'], { ingredientGroups: group('Pecorino Romano') }), ['pecorino']);
  assert.deepEqual(dietConflicts([], { ingredientGroups: group('Gelatin') }), []);
});

test('a clean fixture passes with matching counts', () => {
  const r = check(fixture(), 2, 1);
  assert.deepEqual(r.problems, []);
  assert.equal(r.expected.size, 3);
  assert.equal(r.notes.length, 1); // row b has no compact entry
});

test('wrong counts, missing chunk row and blank food-safety note are reported', () => {
  const f = fixture();
  (f.compact[0] as { notes: string[] }).notes = ['Food safety: '.trimEnd()];
  f.chunks = { u01: [], i01: f.inserts as never };
  const joined = check(f, 565, 127).problems.join('\n');
  assert.match(joined, /expected 565/);
  assert.match(joined, /expected 127/);
  assert.match(joined, /in 0 chunks/);
  assert.match(joined, /blank "Food safety:"/);
});

test('vegetarian row with parmesan is flagged', () => {
  const f = fixture();
  (f.full[0] as unknown as { recipe: { ingredientGroups: unknown } }).recipe.ingredientGroups = group('Parmesan');
  assert.match(check(f, 2, 1).problems.join('\n'), /parmesan/);
});

test('parseLive reads JSON arrays and NDJSON', () => {
  assert.equal(parseLive('[{"id":"a"},{"id":"b"}]').length, 2);
  assert.equal(parseLive('{"id":"a"}\n{"id":"b"}\n').length, 2);
  assert.equal(parseLive('  ').length, 0);
});

test('diffLive reports match, mismatch, missing and extra', () => {
  const expected = new Map([
    ['id:a', stepsMd5(steps)],
    ['id:b', stepsMd5(steps)],
    ['slug:new-one', stepsMd5(steps)],
  ]);
  const live = [
    { id: 'a', steps }, // match
    { id: 'b', recipe: { steps: [{ text: 'Different' }] } }, // mismatch
    { id: 'zzz', slug: 'not-ours', steps }, // extra; 'new-one' missing
  ];
  const d = diffLive(expected, live);
  assert.equal(d.matched, 1);
  assert.equal(d.mismatched.length, 1);
  assert.deepEqual(d.missing, ['slug:new-one']);
  assert.deepEqual(d.extra, ['id:zzz']);
  // an insert matches by slug even though the live id is new
  assert.equal(diffLive(expected, [{ id: 'fresh', slug: 'new-one', recipe: JSON.stringify({ steps }) as never }]).matched, 1);
});
