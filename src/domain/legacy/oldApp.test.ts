import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index } from '../testing/fixtures';
import { buildRecipe } from '../recipes/draft';
import { importOldApp, type ImportContext } from './oldApp';
import { welcomeBackLine } from './welcome';

const ctx: ImportContext = {
  catalogueIds: new Set(catalogue.map((r) => r.id)),
  dish: (id) => catalogue.find((r) => r.id === id),
  index,
  now: 1_700_000_000_000,
};

/**
 * The old app's saved blob, field for field: a copy of its `Persisted` type
 * (the-pantry/src/store/useStore.ts), so this fixture can't drift into names
 * the old app never wrote (audit F09).
 */
type V1Persisted = {
  favorites: string[];
  collections: { id: string; name: string; createdAt: number; recipeIds: string[] }[];
  hidden: string[];
  recents: string[];
  customMeals: { id: string; name: string }[];
  customRecipes: Record<
    string,
    {
      servings: number;
      prepMinutes: number;
      cookMinutes: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      ingredients: { section?: string; items: string[] }[];
      steps: string[];
      notes?: string[];
    }
  >;
  filters: { cuisines: string[]; diets: string[]; mealTypes: string[]; times: string[]; difficulties: string[] };
  cart: string[];
  cartChecked: Record<string, boolean>;
  cartDays: Record<string, { day: string; slot: string }>;
  shoppingExcluded: string[];
  preferences: {
    completed: boolean;
    diet: 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian';
    cuisines: string[];
    time: 'quick' | 'medium' | 'long';
    skill: 'easy' | 'medium' | 'hard';
    avoid: string[];
    unitSystem: 'metric' | 'imperial';
  };
  profile: { name: string; email: string; avatarImage?: string; avatarEmoji: string };
  cookedRecipes: string[];
  pantryItems: string[];
  notificationPrefs: { push: boolean; activity: boolean; messages: boolean; weeklyDigest: boolean };
  privateAccount: boolean;
  entitlement: { isPro: boolean; source: string | null; expiresAt: number | null };
  pushToken: string | null;
  crashReportingEnabled: boolean;
};

const OLD: V1Persisted = {
  // Add order: v1 appended each new favourite and showed the list reversed.
  favorites: ['spaghetti-bolognese', 'gone-forever-dish', 'custom-nans-soup'],
  collections: [
    { id: 'c1', name: 'Weeknights', createdAt: 1, recipeIds: ['thai-green-curry', 'gone-forever-dish'] },
    { id: 'c2', name: '  ', createdAt: 2, recipeIds: [] },
  ],
  hidden: ['thai-green-curry'],
  recents: ['spaghetti-bolognese'],
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
  filters: { cuisines: [], diets: [], mealTypes: [], times: [], difficulties: [] },
  cart: ['spaghetti-bolognese'],
  cartChecked: {},
  cartDays: { 'spaghetti-bolognese': { day: 'tue', slot: 'dinner' } },
  shoppingExcluded: [],
  preferences: {
    completed: true,
    diet: 'pescatarian',
    cuisines: ['italian', 'asian'],
    time: 'quick',
    skill: 'medium',
    avoid: ['nuts', 'coriander'],
    unitSystem: 'metric',
  },
  profile: { name: 'Sam', email: 'sam@example.com', avatarEmoji: '🍳' },
  cookedRecipes: ['spaghetti-bolognese', 'custom-nans-soup', 'gone-forever-dish'],
  pantryItems: ['Rice', 'Chicken', 'Unobtainium'],
  notificationPrefs: { push: true, activity: true, messages: true, weeklyDigest: false },
  privateAccount: false,
  entitlement: { isPro: false, source: null, expiresAt: null },
  pushToken: null,
  crashReportingEnabled: true,
};

const run = (old: Partial<V1Persisted> = OLD, c: ImportContext = ctx) => {
  const result = importOldApp(JSON.stringify(old), c);
  assert.ok(result);
  return result;
};

describe('importOldApp', () => {
  const result = run();
  const soup = result.recipes.find((r) => r.draft.title === 'Nan’s soup');

  it('keeps built-in references and drops dishes that no longer exist, counting each once', () => {
    assert.deepEqual(result.hidden, ['thai-green-curry']);
    assert.deepEqual(result.collections, [{ id: 'v1-c1', name: 'Weeknights', recipeIds: ['thai-green-curry'], createdAt: 1 }]);
    assert.equal(result.dropped, 1);
  });

  it('reads recently viewed from the old `recents`', () => {
    assert.deepEqual(result.recentlyViewed, ['spaghetti-bolognese']);
  });

  it('brings each cooked dish over once, dated at import and flagged as having no real date', () => {
    assert.ok(soup);
    assert.deepEqual(result.cooks, [
      { id: 'v1-cooked-spaghetti-bolognese', recipeId: 'spaghetti-bolognese', cookedAt: ctx.now, dateUnknown: true },
      { id: `v1-cooked-${soup.id}`, recipeId: soup.id, cookedAt: ctx.now, dateUnknown: true },
    ]);
  });

  it('lists saved recipes newest first, the way the old app showed them', () => {
    assert.ok(soup);
    assert.deepEqual(result.bookmarks, [soup.id, 'spaghetti-bolognese']);
  });

  it('turns custom recipes into your own, and points old references at them', () => {
    assert.ok(soup);
    assert.ok(soup.id.startsWith('my-nan-s-soup-'));
    assert.equal(soup.draft.ingredientsText, 'Soup:\n1 cup red lentils\n1 brown onion, diced');
    assert.equal(soup.draft.servings, 6);
  });

  it('gives the same ids every run, so a re-run finds what the last one made', () => {
    assert.deepEqual(run(), result);
  });

  it('reuses a recipe an earlier importer already made with the same title', () => {
    const again = run(OLD, { ...ctx, mine: (title) => (title === 'Nan’s soup' ? 'my-nan-s-soup-ab12' : undefined) });
    assert.ok(again.recipes.some((r) => r.id === 'my-nan-s-soup-ab12'));
    assert.ok(again.bookmarks.includes('my-nan-s-soup-ab12'));
  });

  it('makes a name-only meal a draft with just a title', () => {
    const toastie = result.recipes.find((r) => r.draft.title === 'Toastie');
    assert.ok(toastie);
    assert.equal(toastie.draft.ingredientsText, '');
    assert.equal(buildRecipe(toastie.id, toastie.draft, 'user', index).recipe, undefined);
  });

  it('brings an edited built-in across as "my version", with the dish’s cuisine and meals', () => {
    const original = catalogue.find((r) => r.id === 'spaghetti-bolognese');
    const mine = result.recipes.find((r) => r.draft.title.endsWith('(my version)'));
    assert.ok(original && mine);
    assert.equal(mine.draft.title, `${original.title} (my version)`);
    assert.equal(mine.draft.cuisine, original.cuisine);
    assert.deepEqual(mine.draft.mealTypes, original.mealTypes);
    assert.ok(result.bookmarks.includes('spaghetti-bolognese'));
  });

  it('reads v1 loose names as the cut our recipes use, and keeps the names it can’t match', () => {
    assert.deepEqual([...result.cupboard].sort(), ['chicken-thigh', 'white-rice']);
    assert.deepEqual(result.cupboardMissed, ['Unobtainium']);
  });

  it('matches the old app’s general cupboard names', () => {
    const names = [
      'Pork',
      'Lamb',
      'Turkey',
      'Noodles',
      'Berries',
      'Jam',
      'Curry paste',
      'Sardines',
      'Tempeh',
      'Fennel',
      'Banana',
      'Grapes',
      'Chia seeds',
      'Flax seeds',
    ];
    const r = run({ pantryItems: names });
    assert.deepEqual(r.cupboardMissed, []);
    assert.equal(r.cupboard.length, names.length);
  });

  it('carries the old onboarding answers over', () => {
    assert.ok(result.taste);
    assert.equal(result.taste.diet, 'pescatarian');
    assert.deepEqual(result.taste.avoid, { options: ['nuts'], custom: ['coriander'] });
    assert.equal(result.taste.weeknight, 'under-30');
    assert.ok(result.taste.cuisines.includes('italian') && result.taste.cuisines.includes('thai'));
  });

  it('treats a skipped old onboarding (every answer left at its default) as not answered', () => {
    const skipped = {
      completed: true,
      diet: 'omnivore',
      cuisines: [],
      time: 'medium',
      skill: 'medium',
      avoid: [],
      unitSystem: 'metric',
    } as const;
    assert.equal(run({ preferences: { ...skipped, cuisines: [], avoid: [] } }).taste, undefined);
    assert.equal(run({ preferences: { ...skipped, cuisines: [], avoid: [], time: 'quick' } }).taste?.weeknight, 'under-30');
  });

  it('never brings over the old plan, shopping list or profile', () => {
    assert.equal(
      Object.keys(result).some((k) => /cart|plan|shop|profile|email/i.test(k)),
      false,
    );
    assert.equal(JSON.stringify(result).includes('sam@example.com'), false);
  });

  it('survives junk without throwing', () => {
    assert.equal(importOldApp('not json', ctx), undefined);
    assert.equal(importOldApp('[1,2]', ctx), undefined);
    const empty = importOldApp('{"favorites": "nope", "collections": [null, 3], "cookedRecipes": [{}]}', ctx);
    assert.ok(empty);
    assert.equal(welcomeBackLine(empty), undefined);
  });
});

describe('welcomeBackLine', () => {
  it('says what came across in one line, what needs a cuisine, and what was left behind', () => {
    assert.equal(
      welcomeBackLine(run()),
      'Welcome back. We brought over 2 saved recipes, 1 collection, 3 recipes of your own, 2 cooked dishes, 1 hidden dish and 2 cupboard items. ' +
        '2 of your recipes need a cuisine before they show up everywhere: pick one in My recipes. ' +
        'One dish is no longer in the app, so it was left behind. ' +
        'We couldn’t match Unobtainium from your cupboard, so add it again.',
    );
  });

  it('still speaks up when only hidden dishes, a cupboard or dropped dishes came across', () => {
    assert.equal(welcomeBackLine(run({ hidden: ['thai-green-curry'] })), 'Welcome back. We brought over 1 hidden dish.');
    assert.equal(welcomeBackLine(run({ pantryItems: ['Rice'] })), 'Welcome back. We brought over 1 cupboard item.');
    assert.equal(
      welcomeBackLine(run({ favorites: ['gone-a', 'gone-b'] })),
      'Welcome back. 2 dishes are no longer in the app, so they were left behind.',
    );
  });
});
