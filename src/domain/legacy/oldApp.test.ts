import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index } from '../testing/fixtures';
import { buildRecipe } from '../recipes/draft';
import { importOldApp, welcomeBackLine, type ImportContext } from './oldApp';

let n = 0;
const ctx: ImportContext = {
  catalogueIds: new Set(catalogue.map((r) => r.id)),
  titleOf: (id) => catalogue.find((r) => r.id === id)?.title,
  index,
  now: 1_700_000_000_000,
  random: () => `r${n++}`,
};

const OLD = {
  favorites: ['spaghetti-bolognese', 'gone-forever-dish', 'custom-nans-soup'],
  collections: [
    { id: 'c1', name: 'Weeknights', createdAt: 1, recipeIds: ['thai-green-curry', 'gone-forever-dish'] },
    { id: 'c2', name: '  ', createdAt: 2, recipeIds: [] },
  ],
  hidden: ['thai-green-curry'],
  recentlyViewed: ['spaghetti-bolognese'],
  customMeals: [
    { id: 'custom-nans-soup', name: 'Nan’s soup' },
    { id: 'custom-toastie', name: 'Toastie' },
  ],
  customRecipes: {
    'custom-nans-soup': {
      servings: 6,
      prepMinutes: 10,
      cookMinutes: 40,
      ingredients: [{ section: 'Soup', items: ['1 cup red lentils', '1 brown onion, diced'] }],
      steps: ['Soften the onion.', 'Simmer with lentils.'],
    },
    'spaghetti-bolognese': {
      servings: 4,
      prepMinutes: 5,
      cookMinutes: 60,
      ingredients: [{ items: ['500g beef mince'] }],
      steps: ['Cook.'],
    },
  },
  cookLog: [
    { id: 'spaghetti-bolognese', at: 1_690_000_000_000 },
    { id: 'custom-nans-soup', at: 1_691_000_000_000 },
    { id: 'gone-forever-dish', at: 1_692_000_000_000 },
  ],
  pantryItems: ['Rice', 'Chicken', 'Unobtainium'],
  cart: ['spaghetti-bolognese'],
  cartDays: { 'spaghetti-bolognese': { day: 'tue', slot: 'dinner' } },
  preferences: {
    completed: true,
    diet: 'pescatarian',
    cuisines: ['italian', 'asian'],
    time: 'quick',
    avoid: ['nuts', 'coriander'],
    unitSystem: 'metric',
  },
};

describe('importOldApp', () => {
  const result = importOldApp(JSON.stringify(OLD), ctx);

  it('reads the old data at all', () => {
    assert.ok(result);
  });

  it('keeps built-in references and drops dishes that no longer exist, counting each once', () => {
    assert.ok(result);
    assert.deepEqual(result.hidden, ['thai-green-curry']);
    assert.deepEqual(result.collections, [{ name: 'Weeknights', recipeIds: ['thai-green-curry'], createdAt: 1 }]);
    assert.equal(result.dropped, 1);
  });

  it('turns custom recipes into your own, and points old references at them', () => {
    assert.ok(result);
    const soup = result.recipes.find((r) => r.draft.title === 'Nan’s soup');
    assert.ok(soup);
    assert.ok(soup.id.startsWith('my-nan-s-soup-'));
    assert.equal(soup.draft.ingredientsText, 'Soup:\n1 cup red lentils\n1 brown onion, diced');
    assert.equal(soup.draft.servings, 6);
    assert.ok(result.bookmarks.includes(soup.id));
    assert.ok(result.cooks.some((c) => c.recipeId === soup.id));
  });

  it('makes a name-only meal a draft with just a title', () => {
    assert.ok(result);
    const toastie = result.recipes.find((r) => r.draft.title === 'Toastie');
    assert.ok(toastie);
    assert.equal(toastie.draft.ingredientsText, '');
    assert.equal(buildRecipe(toastie.id, toastie.draft, 'user', index).recipe, undefined);
  });

  it('brings an edited built-in across as "my version" without taking over the original', () => {
    assert.ok(result);
    assert.ok(result.recipes.some((r) => r.draft.title === 'Spaghetti Bolognese (my version)' || r.draft.title.endsWith('(my version)')));
    assert.ok(result.bookmarks.includes('spaghetti-bolognese'));
  });

  it('matches cupboard items to ingredients and leaves unknown ones out', () => {
    assert.ok(result);
    assert.equal(result.cupboard.length, 2);
  });

  it('reads v1 loose names as the cut our recipes use: Chicken means thigh, not pieces', () => {
    assert.ok(result);
    assert.deepEqual([...result.cupboard].sort(), ['chicken-thigh', 'white-rice']);
  });

  it('carries the old onboarding answers over', () => {
    assert.ok(result?.taste);
    assert.equal(result.taste.diet, 'pescatarian');
    assert.deepEqual(result.taste.avoid, { options: ['nuts'], custom: ['coriander'] });
    assert.equal(result.taste.weeknight, 'under-30');
    assert.ok(result.taste.cuisines.includes('italian') && result.taste.cuisines.includes('thai'));
  });

  it('never brings over the old plan or shopping list', () => {
    assert.ok(result);
    assert.equal(
      Object.keys(result).some((k) => /cart|plan|shop/i.test(k)),
      false,
    );
  });

  it('survives junk without throwing', () => {
    assert.equal(importOldApp('not json', ctx), undefined);
    assert.equal(importOldApp('[1,2]', ctx), undefined);
    const empty = importOldApp('{"favorites": "nope", "collections": [null, 3], "cookLog": [{}]}', ctx);
    assert.ok(empty);
    assert.equal(welcomeBackLine(empty), undefined);
  });
});

describe('welcomeBackLine', () => {
  it('says what came across in one line, and what was left behind', () => {
    const result = importOldApp(JSON.stringify(OLD), ctx);
    assert.ok(result);
    assert.equal(
      welcomeBackLine(result),
      'Welcome back. We brought over 2 saved recipes, 1 collection, 3 recipes of your own and 2 cooks in your history. One dish is no longer in the app, so it was left behind.',
    );
  });
});
