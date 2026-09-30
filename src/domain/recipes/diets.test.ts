import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseIngredientLine } from '../ingredients/parse';
import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { AVOID_OPTIONS, avoidMatches, containsAvoided, deriveDiets, fitsDietPreference, fitsTaste, type AvoidOption } from './diets';
import { allLines } from './types';

const diets = (lines: string[]) => deriveDiets(allLines(makeRecipe('x', lines)), index);
const avoids = (lines: string[], options: AvoidOption[], custom: string[] = []) =>
  containsAvoided(makeRecipe('x', lines), { options, custom }, index);
const custom = (lines: string[], word: string) => avoids(lines, [], [word]);

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
  it('an unidentified ingredient with a quantity blocks every tag', () => {
    assert.deepEqual(diets(['1 brown onion', '2 tbsp mystery paste']), []);
  });
  it('an unidentified ingredient with no amount blocks every tag too (F181)', () => {
    assert.deepEqual(diets(['400 g pasta', 'nduja, to serve']), []);
  });
  it('optional meat and seafood still rule out vegetarian and pescatarian (F152)', () => {
    assert.ok(!diets(['1 brown onion', '150g pancetta, diced (optional)']).includes('vegetarian'));
    assert.ok(!diets(['1 brown onion', '100g bacon (optional)']).includes('vegan'));
    assert.ok(!diets(['2 salmon fillets', '4 rashers bacon (optional)']).includes('pescatarian'));
  });
  it('other optional lines still do not decide the diet', () => {
    assert.ok(diets(['1 brown onion', '50g feta (optional)']).includes('vegan'));
  });
  it('rennet cheeses stay vegetarian (Lachlan, 30 Sep 2026)', () => {
    assert.ok(diets(['50g parmesan', '50g pecorino', '100g gruyère']).includes('vegetarian'));
  });
  it('"X or Y" needs every option to fit (F189)', () => {
    assert.ok(!diets(['400 g lamb or eggplant']).includes('vegan'));
    assert.ok(!diets(['400 g lamb or eggplant']).includes('vegetarian'));
    assert.ok(!diets(['300 g chicken or firm tofu']).includes('vegan'));
    assert.ok(!diets(['300g raw prawns or 300g cooked chicken']).includes('pescatarian'));
    assert.ok(!diets(['Basmati rice or naan']).includes('no-gluten'));
    assert.ok(diets(['1 cup fresh or frozen peas']).includes('vegan'));
  });
});

describe('diet preferences', () => {
  it('pescatarians can eat vegetarian dishes too', () => {
    assert.ok(fitsDietPreference({ diets: ['vegetarian'] }, 'pescatarian'));
    assert.ok(!fitsDietPreference({ diets: [] }, 'pescatarian'));
    assert.ok(fitsDietPreference({ diets: [] }, 'everything'));
  });
  it('fitsTaste applies the diet and the avoid list together', () => {
    const r = makeRecipe('r', ['1 brown onion', '200g cashews'], { diets: ['vegetarian', 'vegan'] });
    assert.ok(fitsTaste(r, { diet: 'vegan', avoid: { options: [], custom: [] } }, index));
    assert.ok(!fitsTaste(r, { diet: 'vegan', avoid: { options: ['nuts'], custom: [] } }, index));
    assert.ok(!fitsTaste({ ...r, diets: [] }, { diet: 'vegan', avoid: { options: [], custom: [] } }, index));
  });
});

// One ingredient per preset option, each in exactly that option's groups (F210).
const ONE_GROUP: Record<AvoidOption, string> = {
  nuts: '200g cashews',
  shellfish: '300g prawns',
  fish: '2 salmon fillets',
  pork: '500g pork mince',
  beef: '500g beef mince',
  lamb: '500g lamb mince',
  dairy: '100g butter',
  eggs: '2 eggs',
  gluten: '200g plain flour',
  sesame: '1 tbsp sesame seeds',
  soy: '200g firm tofu',
  spicy: '1 red chilli',
  alcohol: '125ml dry white wine',
};
const OPTIONS = Object.keys(AVOID_OPTIONS) as AvoidOption[];

describe('containsAvoided: preset options', () => {
  for (const option of OPTIONS) {
    it(`"${option}" hides ${ONE_GROUP[option]}, and no other option does`, () => {
      assert.ok(avoids(['1 brown onion', ONE_GROUP[option]], [option]), option);
      for (const other of OPTIONS.filter((o) => o !== option)) assert.ok(!avoids(['1 brown onion', ONE_GROUP[option]], [other]), other);
    });
  }
  it('"nuts" covers peanuts on their own', () => {
    assert.ok(avoids(['2 tbsp peanut butter'], ['nuts']));
    assert.ok(avoids(['50g roasted peanuts'], ['nuts']));
  });
  it('surf and turf: beef and prawns', () => {
    const lines = ['300g beef steak', '200g prawns'];
    assert.ok(avoids(lines, ['beef']) && avoids(lines, ['shellfish']));
    assert.ok(!avoids(lines, ['fish']) && !avoids(lines, ['pork']));
    assert.ok(!diets(lines).includes('pescatarian') && !diets(lines).includes('vegetarian'));
  });
  it('egg only: vegetarian, not vegan, hidden by eggs only', () => {
    assert.ok(diets(['2 eggs']).includes('vegetarian') && !diets(['2 eggs']).includes('vegan'));
    assert.deepEqual(
      OPTIONS.filter((o) => avoids(['2 eggs'], [o])),
      ['eggs'],
    );
  });
  it('honey only: vegetarian, not vegan, hidden by no option', () => {
    assert.ok(diets(['1 tbsp honey']).includes('vegetarian') && !diets(['1 tbsp honey']).includes('vegan'));
    assert.deepEqual(
      OPTIONS.filter((o) => avoids(['1 tbsp honey'], [o])),
      [],
    );
  });
  it('optional lines still count: better to hide the dish', () => {
    assert.ok(avoids(['1 brown onion', '50g walnuts (optional)'], ['nuts']));
  });
  it('plain pork, lamb, fish and tempeh are recognised (F211)', () => {
    assert.ok(avoids(['500 g pork, diced'], ['pork']));
    assert.ok(avoids(['1 kg lamb, cubed'], ['lamb']));
    assert.ok(avoids(['600 g fish, cut into chunks'], ['fish']));
    assert.ok(avoids(['300 g tempeh'], ['soy']));
  });
  it('an unrecognised line still gives itself away by a group word (F211)', () => {
    assert.equal(index.match("pig's trotters"), undefined);
    assert.ok(avoids(["2 pig's trotters"], ['pork']));
    assert.ok(!avoids(["2 pig's trotters"], ['beef']));
  });
  it('either option of "X or Y" triggers the avoid list (F189)', () => {
    assert.ok(avoids(['400 g lamb or eggplant'], ['lamb']));
    assert.ok(avoids(['500g beef or lamb mince'], ['lamb']));
    assert.ok(avoids(['500g beef or lamb mince'], ['beef']));
    assert.ok(custom(['400 g lamb or eggplant'], 'eggplant'));
  });
});

describe('containsAvoided: custom words (F136)', () => {
  it('match the database and plain words', () => {
    assert.ok(custom(['1 bunch coriander'], 'coriander'));
    assert.ok(custom(['1 tbsp kasuri methi'], 'methi'));
    assert.ok(!custom(['1 bunch coriander'], 'mushroom'));
  });
  it('"olives" hides olives, not olive oil', () => {
    assert.ok(custom(['100g kalamata olives'], 'olives'));
    assert.ok(custom(['50g green olives'], 'olive'));
    assert.ok(!custom(['2 tbsp extra virgin olive oil'], 'olives'));
  });
  it('an oil in an allergy group still counts', () => {
    assert.ok(custom(['1 tsp sesame oil'], 'sesame'));
    assert.ok(custom(['2 tbsp peanut oil'], 'peanut'));
  });
  it('"chillies" and "chilli" hide the same dishes', () => {
    assert.equal(avoidMatches('chillies', catalogue, index), avoidMatches('chilli', catalogue, index));
    assert.ok(custom(['1 tbsp sriracha'], 'chillies'));
  });
  it('"cheese" covers named cheeses', () => {
    for (const line of ['50g parmesan', '100g feta', '100g cheddar', '200g blue cheese']) assert.ok(custom([line], 'cheese'), line);
    assert.ok(!custom(['100g butter'], 'cheese'));
  });
  it('"chicken" covers every cut and chicken stock', () => {
    for (const line of ['4 chicken thighs', '2 chicken breasts', '1 L chicken stock']) assert.ok(custom([line], 'chicken'), line);
  });
  it('multi-word words match as a phrase', () => {
    assert.ok(custom(['1 sweet potato'], 'sweet potato'));
    assert.ok(!custom(['2 potatoes'], 'sweet potato'));
    assert.ok(custom(['1 tbsp fish sauce'], 'fish sauce'));
    assert.ok(!custom(['2 salmon fillets'], 'fish sauce'));
  });
  it('a word the database has never heard of is looked for in the text', () => {
    assert.ok(custom(['1 tbsp truffle paste'], 'truffle'));
    assert.ok(!custom(['1 brown onion'], 'truffle'));
  });
  it('a word that names a group means the group', () => {
    assert.ok(custom(['300g prawns'], 'seafood'));
    assert.ok(custom(['200g cashews'], 'nuts'));
  });
  it('odd words never match by accident', () => {
    assert.ok(!custom(['1 brown onion'], 'constructor'));
    assert.ok(!custom(['1 brown onion'], '  '));
  });
  it('avoidMatches counts the recipes a word would hide', () => {
    const pool = [makeRecipe('a', ['100g kalamata olives']), makeRecipe('b', ['2 tbsp olive oil']), makeRecipe('c', ['1 brown onion'])];
    assert.equal(avoidMatches('olives', pool, index), 1);
    assert.equal(avoidMatches('onion', pool, index), 1);
    assert.ok(avoidMatches('olives', catalogue, index) < 40);
  });
});

describe('the stored catalogue matches the current database (F157)', () => {
  it('every line still resolves to the stored ingredient', () => {
    for (const r of catalogue)
      for (const line of allLines(r))
        assert.equal(parseIngredientLine(line.raw, index.match).line.ingredientId, line.ingredientId, `${r.id}: ${line.raw}`);
  });
  it('every recipe still derives the stored diets', () => {
    for (const r of catalogue) assert.deepEqual(deriveDiets(allLines(r), index), r.diets, r.id);
  });
});
