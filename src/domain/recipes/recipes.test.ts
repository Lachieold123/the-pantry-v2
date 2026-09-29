import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { containsAvoided, deriveDiets, fitsDietPreference } from './diets';
import { countActiveFilters, editDistance, indexForSearch, matchesFilters, NO_FILTERS, searchRecipes, seasonOn } from './search';
import { allLines } from './types';
import { substitutionFor, SUBSTITUTION_IDS } from './substitutions';
import { validateRecipe } from './validate';

const diets = (lines: string[]) => deriveDiets(allLines(makeRecipe('x', lines)), index.byId);

describe('deriveDiets', () => {
  it('tags a plant-only dish vegan and vegetarian', () => {
    assert.deepEqual(diets(['400g tinned chickpeas', '1 brown onion', '2 tbsp olive oil']), [
      'vegetarian',
      'vegan',
      'no-gluten',
      'no-dairy',
    ]);
  });
  it('dairy and eggs are vegetarian but not vegan', () => {
    assert.deepEqual(diets(['100g butter', '2 eggs']), ['vegetarian', 'no-gluten']);
  });
  it('fish makes it pescatarian, not vegetarian', () => {
    assert.deepEqual(diets(['2 salmon fillets']), ['pescatarian', 'no-gluten', 'no-dairy']);
  });
  it('hidden animal products count: fish sauce, oyster sauce, chicken stock', () => {
    assert.ok(!diets(['1 tbsp fish sauce']).includes('vegetarian'));
    assert.ok(!diets(['2 tbsp oyster sauce']).includes('vegetarian'));
    assert.ok(!diets(['500ml chicken stock']).includes('vegetarian'));
  });
  it('soy sauce contains gluten', () => {
    assert.ok(!diets(['2 tbsp soy sauce']).includes('no-gluten'));
  });
  it('optional ingredients do not decide the diet', () => {
    const r = makeRecipe('x', ['1 brown onion', '100g bacon (optional)']);
    assert.ok(deriveDiets(allLines(r), index.byId).includes('vegetarian'));
  });
  it('an unidentified ingredient with a quantity blocks every tag', () => {
    assert.deepEqual(diets(['1 brown onion', '2 tbsp mystery paste']), []);
  });
});

describe('diet preferences', () => {
  it('pescatarians can eat vegetarian dishes too', () => {
    assert.ok(fitsDietPreference({ diets: ['vegetarian'] }, 'pescatarian'));
    assert.ok(!fitsDietPreference({ diets: [] }, 'pescatarian'));
    assert.ok(fitsDietPreference({ diets: [] }, 'everything'));
  });
});

describe('containsAvoided', () => {
  const satay = makeRecipe('satay', ['2 tbsp peanut butter', '1 tbsp soy sauce', '200g cashews']);
  it('"nuts" covers peanuts and tree nuts', () => {
    assert.ok(containsAvoided(satay, { options: ['nuts'], custom: [] }, index));
  });
  it('"gluten" catches soy sauce, not just flour', () => {
    assert.ok(containsAvoided(satay, { options: ['gluten'], custom: [] }, index));
  });
  it('custom entries match the database and plain words', () => {
    const r = makeRecipe('r', ['1 bunch coriander', '1 tbsp kasuri methi']);
    assert.ok(
      containsAvoided(r, { options: [], custom: ['cilantro'] }, index) || containsAvoided(r, { options: [], custom: ['coriander'] }, index),
    );
    assert.ok(containsAvoided(r, { options: [], custom: ['methi'] }, index));
    assert.ok(!containsAvoided(r, { options: [], custom: ['mushroom'] }, index));
  });
  it('optional lines still count: better to hide the dish', () => {
    const r = makeRecipe('r', ['1 brown onion', '50g walnuts (optional)']);
    assert.ok(containsAvoided(r, { options: ['nuts'], custom: [] }, index));
  });
});

describe('search', () => {
  const searchIndex = indexForSearch(catalogue, (c) => c);
  it('forgives typos: "chiken" finds chicken', () => {
    const results = searchRecipes(searchIndex, 'chiken');
    assert.ok(results.length > 10);
    assert.ok(results.slice(0, 10).every((r) => /chicken/i.test(r.title)));
  });
  it('prefers title matches over ingredient matches', () => {
    assert.match(searchRecipes(searchIndex, 'laksa')[0]?.title ?? '', /laksa/i);
  });
  it('finds by ingredient and cuisine', () => {
    assert.ok(searchRecipes(searchIndex, 'halloumi').length >= 3);
    assert.ok(searchRecipes(searchIndex, 'korean').length >= 5);
  });
  it('returns nothing for nonsense, everything for an empty query', () => {
    assert.equal(searchRecipes(searchIndex, 'zzqxj').length, 0);
    assert.equal(searchRecipes(searchIndex, '  ').length, catalogue.length);
  });
  it('does not fuzz short words', () => {
    assert.equal(editDistance('pie', 'pig', 0), 1);
  });
});

describe('filters', () => {
  it('counts active filters for the badge', () => {
    assert.equal(countActiveFilters(NO_FILTERS), 0);
    assert.equal(countActiveFilters({ ...NO_FILTERS, cuisines: ['thai', 'korean'], onePot: true }), 2);
  });
  it('treats untagged recipes as year-round', () => {
    const r = makeRecipe('r', ['1 egg']);
    assert.ok(matchesFilters(r, { ...NO_FILTERS, inSeason: 'winter' }));
    assert.ok(!matchesFilters({ ...r, seasons: ['summer'] }, { ...NO_FILTERS, inSeason: 'winter' }));
  });
  it('knows southern hemisphere seasons', () => {
    assert.equal(seasonOn(new Date(2026, 0, 15)), 'summer');
    assert.equal(seasonOn(new Date(2026, 6, 15)), 'winter');
    assert.equal(seasonOn(new Date(2026, 9, 1)), 'spring');
  });
});

describe('the converted catalogue', () => {
  it('has unique ids and every recipe passes validation', () => {
    assert.equal(new Set(catalogue.map((r) => r.id)).size, catalogue.length);
    for (const r of catalogue) assert.deepEqual(validateRecipe(r), [], r.id);
  });
  it('every recipe has an explicit cuisine and at least one meal type', () => {
    for (const r of catalogue) assert.ok(r.cuisine && r.mealTypes.length > 0, r.id);
  });
  it('every quantified, non-optional line is identified', () => {
    const unknown = catalogue.flatMap((r) =>
      allLines(r)
        .filter((l) => l.quantity !== undefined && !l.optional && !l.ingredientId)
        .map((l) => `${r.id}: ${l.raw}`),
    );
    assert.deepEqual(unknown, []);
  });
  it('stays drafts until Lachlan vets them (D-008)', () => {
    assert.ok(catalogue.every((r) => r.provenance === 'ai-draft'));
  });
});

describe('validateRecipe', () => {
  const good = makeRecipe('good-dish', ['1 egg']);
  const paths = (r: Parameters<typeof validateRecipe>[0]) => validateRecipe(r).map((p) => p.path);
  it('accepts a well-formed recipe', () => {
    assert.deepEqual(validateRecipe(good), []);
  });
  it('rejects bad ids, empty titles, unknown tags and impossible numbers', () => {
    const bad = {
      ...good,
      id: 'Bad Id',
      title: ' ',
      cuisine: 'martian' as never,
      mealTypes: [],
      diets: ['vegan' as const],
      servings: 0,
      prepMinutes: -5,
      steps: [{ text: '' }],
    };
    const p = paths(bad);
    for (const expected of ['id', 'title', 'cuisine', 'mealTypes', 'diets', 'servings', 'prepMinutes', 'steps[0]'])
      assert.ok(p.includes(expected), expected);
  });
  it('rejects broken ingredient lines', () => {
    const r = {
      ...good,
      ingredientGroups: [
        {
          items: [
            { item: '', raw: 'x', unit: 'g' as const },
            { item: 'rice', raw: 'y', quantity: { min: 3, max: 2 } },
          ],
        },
        { items: [] },
      ],
    };
    const p = paths(r);
    assert.ok(p.includes('ingredientGroups[0].items[0].item'));
    assert.ok(p.includes('ingredientGroups[0].items[0]'));
    assert.ok(p.includes('ingredientGroups[0].items[1].quantity'));
    assert.ok(p.includes('ingredientGroups[1]'));
  });
});

describe('substitutions', () => {
  it('every tip is for an ingredient that exists in the database', () => {
    for (const id of SUBSTITUTION_IDS) assert.ok(index.byId.has(id), id);
  });
  it('finds a tip by ingredient, however the recipe words it', () => {
    const line = makeRecipe('r', ['250ml buttermilk, well shaken']).ingredientGroups[0]?.items[0];
    assert.match(substitutionFor(line?.ingredientId) ?? '', /No buttermilk/);
    assert.equal(substitutionFor(undefined), undefined);
    assert.equal(substitutionFor('brown-onion'), undefined);
  });
  it('makes no allergy promises', () => {
    for (const id of SUBSTITUTION_IDS) assert.doesNotMatch(substitutionFor(id) ?? '', /gluten-free|allergy|safe for/i, id);
  });
});
