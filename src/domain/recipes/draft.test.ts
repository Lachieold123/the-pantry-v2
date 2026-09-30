import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IngredientLine } from '../ingredients/types';
import { catalogue, index } from '../testing/fixtures';
import { buildRecipe, EMPTY_DRAFT, myRecipeId, parseIngredientsText, parseMethodText, recipeToDraft, type RecipeDraft } from './draft';

const draft = (over: Partial<RecipeDraft>): RecipeDraft => ({
  ...EMPTY_DRAFT,
  title: 'Nan’s lentil soup',
  cuisine: 'british',
  ingredientsText: '1 cup red lentils\n1 brown onion, diced\n1 litre vegetable stock',
  methodText: 'Soften the onion.\nAdd lentils and stock; simmer 20 minutes.',
  ...over,
});

describe('parseIngredientsText', () => {
  it('reads one ingredient per line and strips bullets people paste in', () => {
    const { groups } = parseIngredientsText('- 2 tbsp olive oil\n• 3 garlic cloves\n\n1. 400g tin crushed tomatoes', index);
    assert.equal(groups.length, 1);
    assert.deepEqual(
      groups[0]?.items.map((i) => i.item),
      ['olive oil', 'garlic', 'crushed tomatoes'],
    );
  });

  it('starts a group at a line ending in a colon', () => {
    const { groups } = parseIngredientsText('Sauce:\n2 tbsp soy sauce\nTo serve:\nsteamed rice', index);
    assert.deepEqual(
      groups.map((g) => g.title),
      ['Sauce', 'To serve'],
    );
  });

  it('drops a heading with nothing under it', () => {
    const { groups } = parseIngredientsText('Sauce:\nGarnish:\n1 lime', index);
    assert.deepEqual(
      groups.map((g) => g.title),
      ['Garnish'],
    );
  });

  it('keeps the whole number of a decimal amount (F39)', () => {
    const { groups } = parseIngredientsText('1.5 kg beef chuck\n0.5 tsp salt\n2.25 cups stock\n1. 2 carrots', index);
    assert.deepEqual(
      groups[0]?.items.map((i) => [i.quantity, i.unit]),
      [
        [1.5, 'kg'],
        [0.5, 'tsp'],
        [2.25, 'cup'],
        [2, undefined],
      ],
    );
  });

  it('strips the bullets Word and Notes use, and lettered lists (F191)', () => {
    const { groups } = parseIngredientsText('● 2 carrots\n– 1 onion\n☐ 3 eggs\n➤ 1 lemon\na) 400g tin crushed tomatoes', index);
    assert.deepEqual(
      groups[0]?.items.map((i) => [i.quantity, i.item]),
      [
        [2, 'carrots'],
        [1, 'onion'],
        [3, 'eggs'],
        [1, 'lemon'],
        [400, 'crushed tomatoes'],
      ],
    );
  });

  it('makes everything under an "Optional…" heading optional (F194)', () => {
    const { groups } = parseIngredientsText('1 onion\nOptional toppings:\n1 lemon\n2 eggs', index);
    assert.deepEqual(
      groups.flatMap((g) => g.items.map((i) => i.optional === true)),
      [false, true, true],
    );
  });

  it('treats a zero amount as unsure instead of an amount (F168)', () => {
    const { groups, unsure } = parseIngredientsText('0 cups flour\n0-1 tsp chilli flakes', index);
    assert.ok(groups[0]?.items.every((i) => i.quantity === undefined && i.unit === undefined));
    assert.deepEqual(
      unsure.map((u) => u.raw),
      ['0 cups flour', '0-1 tsp chilli flakes'],
    );
  });

  it('flags measured lines it can’t recognise, but not "salt and pepper"', () => {
    const { unsure } = parseIngredientsText('200g blorp\nsalt and pepper\n1 onion', index);
    assert.deepEqual(unsure, [{ raw: '200g blorp', reason: 'not-recognised' }]);
  });
});

describe('parseMethodText', () => {
  it('makes one step per line without the numbering', () => {
    assert.deepEqual(parseMethodText('1. Chop.\nStep 2: Fry.\n\n3) Serve.'), [{ text: 'Chop.' }, { text: 'Fry.' }, { text: 'Serve.' }]);
  });
  it('handles "Step 1 -" and keeps a leading decimal (F39, F191)', () => {
    assert.deepEqual(parseMethodText('Step 1 - Chop.\n2.5 hours later, serve.'), [{ text: 'Chop.' }, { text: '2.5 hours later, serve.' }]);
  });
});

describe('buildRecipe', () => {
  it('builds a valid recipe with diets worked out from the ingredients', () => {
    const built = buildRecipe('my-soup-1', draft({}), 'user', index);
    assert.deepEqual(built.problems, []);
    assert.ok(built.recipe);
    assert.ok(built.recipe.diets.includes('vegan'));
    assert.equal(built.recipe.steps.length, 2);
    assert.equal(built.recipe.source, 'user');
  });

  it('says what’s missing in plain words instead of building', () => {
    const built = buildRecipe('my-x-1', draft({ title: ' ', cuisine: undefined, methodText: '' }), 'user', index);
    assert.equal(built.recipe, undefined);
    assert.deepEqual(built.problems.map((p) => p.field).sort(), ['cuisine', 'method', 'title']);
    assert.ok(built.problems.every((p) => /^[A-Z]/.test(p.message)));
  });

  it('names the ingredient line it can’t use instead of "Add at least one ingredient" (F168)', () => {
    const built = buildRecipe('my-x-1', draft({ ingredientsText: '1 cup red lentils\n(to taste)' }), 'user', index);
    assert.equal(built.recipe, undefined);
    assert.deepEqual(built.problems, [{ field: 'ingredients', message: 'Check “(to taste)”: it needs an ingredient name.' }]);
    assert.deepEqual(buildRecipe('my-x-1', draft({ ingredientsText: '' }), 'user', index).problems, [
      { field: 'ingredients', message: 'Add at least one ingredient.' },
    ]);
  });

  it('never tags a recipe vegetarian when it has an unrecognised measured ingredient', () => {
    const built = buildRecipe('my-x-1', draft({ ingredientsText: '1 cup lentils\n300g mystery sausage thing' }), 'user', index);
    assert.ok(built.recipe);
    assert.ok(!built.recipe.diets.includes('vegetarian'));
  });
});

describe('recipeToDraft', () => {
  it('round-trips every catalogue recipe through the editor unchanged in substance', () => {
    // Line by line, not just a count: a count missed "1.5 kg" coming back as "5 kg" (F39, F210).
    const substance = (l: IngredientLine) => [l.quantity, l.unit, l.ingredientId, l.optional === true];
    for (const r of catalogue) {
      const again = buildRecipe(r.id, recipeToDraft(r), 'house', index).recipe;
      assert.ok(again, r.id);
      assert.deepEqual(
        again.steps.map((s) => s.text),
        r.steps.map((s) => s.text),
        r.id,
      );
      assert.deepEqual(
        again.ingredientGroups.flatMap((g) => g.items.map(substance)),
        r.ingredientGroups.flatMap((g) => g.items.map(substance)),
        r.id,
      );
      assert.deepEqual(again.diets, r.diets, r.id);
    }
  });
});

describe('myRecipeId', () => {
  it('is a valid id that can’t clash with the catalogue', () => {
    assert.equal(myRecipeId('Nan’s Lentil Soup!', 'AB12'), 'my-nan-s-lentil-soup-ab12');
    assert.equal(myRecipeId('   ', 'x1'), 'my-x1');
    assert.ok(catalogue.every((r) => !r.id.startsWith('my-')));
  });
});
