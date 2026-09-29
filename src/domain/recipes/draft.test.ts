import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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

  it('flags measured lines it can’t recognise, but not "salt and pepper"', () => {
    const { unsure } = parseIngredientsText('200g blorp\nsalt and pepper\n1 onion', index);
    assert.deepEqual(unsure, [{ raw: '200g blorp', reason: 'not-recognised' }]);
  });
});

describe('parseMethodText', () => {
  it('makes one step per line without the numbering', () => {
    assert.deepEqual(parseMethodText('1. Chop.\nStep 2: Fry.\n\n3) Serve.'), [{ text: 'Chop.' }, { text: 'Fry.' }, { text: 'Serve.' }]);
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

  it('never tags a recipe vegetarian when it has an unrecognised measured ingredient', () => {
    const built = buildRecipe('my-x-1', draft({ ingredientsText: '1 cup lentils\n300g mystery sausage thing' }), 'user', index);
    assert.ok(built.recipe);
    assert.ok(!built.recipe.diets.includes('vegetarian'));
  });
});

describe('recipeToDraft', () => {
  it('round-trips every catalogue recipe through the editor unchanged in substance', () => {
    for (const r of catalogue) {
      const again = buildRecipe(r.id, recipeToDraft(r), 'house', index).recipe;
      assert.ok(again, r.id);
      assert.equal(again.steps.length, r.steps.length, r.id);
      assert.equal(again.ingredientGroups.flatMap((g) => g.items).length, r.ingredientGroups.flatMap((g) => g.items).length, r.id);
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
