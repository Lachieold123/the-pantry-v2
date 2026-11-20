// FOOD-7 (deep audit 20 Nov 2026): the validators must catch every known-bad recipe from the audit
// (scripts/fixtures/known-bad-l7.json), and the new rules must not fire on the look-alikes the catalogue is full of.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { artefactProblems, claimProblems, safetyProblems, type SafetyInput } from './recipe-text-checks.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the validator fails every known-bad recipe for the reason it is bad', () => {
  let out = '';
  try {
    execFileSync('npx', ['tsx', 'scripts/validate-house-recipes.mts', '--no-nutrition', 'scripts/fixtures/known-bad-l7.json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    out = (e as { stdout: string }).stdout;
  }
  const expected: [string, string][] = [
    ['l7-roast-turkey-roll', '[diet] tagged vegetarian but the lines say turkey'],
    ['l7-roast-turkey-roll', '[food-safety] raw poultry: no 75°C'],
    ['l7-kingfish-steaks', 'the ingredients give [pescatarian'],
    ['l7-trifle', '[diet] tagged no-gluten but the lines say sponge'],
    ['l7-trifle', '"jelly-free" looks like find-and-replace damage'],
    ['l7-harira', '[diet] tagged no-gluten but the lines say vermicelli'],
    ['l7-crackles', '[diet] tagged no-gluten but the lines say puffed rice'],
    ['l7-black-bean-tofu', '[diet] tagged no-gluten but the lines say black bean sauce'],
    ['l7-pork-scotch', '[food-safety] fresh pork: no 70°C'],
    ['l7-baby-porridge', '[food-safety] honey in a dish for babies'],
    ['l7-slow-kidney-beans', '[food-safety] dried kidney beans need a hard 10-minute boil'],
    ['l7-chicken-boilerplate', '[food-safety] the "Food safety" note says nothing'],
    ['l7-chicken-boilerplate', '[food-safety] a step or note says the meat need not reach 75°C'],
    ['l7-leftover-rice', '[food-safety] cooked rice'],
  ];
  for (const [id, what] of expected)
    assert.ok(out.split('\n').some((l) => l.includes(`  ${id}  `) && l.includes(what)), `${id}: expected ${what}`);
}, { timeout: 120_000 });

const base: SafetyInput = { ids: new Set(), isPoultry: () => false, lineText: '', title: 'Dish', summary: '', steps: [], notes: [] };
const safety = (r: Partial<SafetyInput>) => safetyProblems({ ...base, ...r });

test('soft egg needs a note for vulnerable people; runny honey and jammy tomatoes are not egg', () => {
  assert.ok(safety({ ids: new Set(['egg']), steps: ['Fry until the yolks are runny.'] }).some((p) => p.startsWith('raw or soft egg')));
  assert.deepEqual(safety({ ids: new Set(['egg']), steps: ['Warm the honey until runny.', 'Simmer the tomatoes until jammy.'] }), []);
  assert.deepEqual(safety({ ids: new Set(['egg']), steps: ['Mix in the raw egg, then bake until set.'] }), []);
  assert.deepEqual(
    safety({ ids: new Set(['egg']), steps: ['Fry until the yolks are runny.'], notes: ['Food safety: pregnant women should have the yolks firm.'] }),
    [],
  );
});

test('a raw-fish name needs raw fish in the lines; tartare sauce is not raw fish', () => {
  assert.ok(safety({ ids: new Set(['salmon']), title: 'Salmon Poke Bowl' }).some((p) => p.startsWith('raw or lightly cured seafood')));
  assert.deepEqual(safety({ ids: new Set(['tofu']), title: 'Tofu Poke Bowl' }), []);
  const fishFingers = safety({ ids: new Set(['white-fish']), title: 'Fish Fingers with Tartare Dip', steps: ['Bake until opaque.'] });
  assert.ok(!fishFingers.some((p) => p.startsWith('raw or lightly cured')));
});

test('honey only matters in a dish for babies; reheating needs steaming hot', () => {
  assert.deepEqual(safety({ lineText: 'honey | baby spinach', steps: ['Keeps 3 months frozen.'] }), []);
  assert.ok(safety({ lineText: 'honey | oats', summary: 'Porridge for babies from 6 months.' }).some((p) => p.startsWith('honey')));
  assert.ok(safety({ steps: ['Reheat gently.'] }).some((p) => p.startsWith('reheating')));
  assert.deepEqual(safety({ steps: ['Reheat until steaming hot.'] }), []);
});

test('a hedged diet claim passes; a flat one a line breaks fails', () => {
  assert.equal(claimProblems(['Gluten-free.'], new Set(['gluten'])).length, 1);
  assert.deepEqual(claimProblems(['Gluten-free if you use gluten-free soy sauce.'], new Set(['gluten'])), []);
});

test('"X-free" artefacts are caught, real free-words are not', () => {
  assert.equal(artefactProblems(['Pandan-Free Coconut Custard Pots']).length, 1);
  assert.deepEqual(artefactProblems(['Gluten-free and dairy-free pancakes, egg-free too']), []);
});
