import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COOK_ROW, feedRow, RECIPE_JSON } from '../testing/published';
import {
  appendPage,
  countLabel,
  creditLine,
  cursorAfter,
  olderThan,
  parseCook,
  parseFeedItem,
  parseFeedPage,
  parseRecipe,
  storageUrl,
} from './published';

const BASE = 'https://example.supabase.co';

describe('parseFeedItem', () => {
  it('reads a row with its cook', () => {
    const item = parseFeedItem(feedRow(1));
    assert.equal(item?.title, 'Dish 1');
    assert.equal(item?.cook.handle, 'kinilaw.kai');
    assert.equal(item?.cook.displayName, 'Kai Santos');
    assert.equal(item?.photoCredit, 'Photo: Someone / Pexels');
    assert.equal(item?.totalMinutes, 45);
  });
  it('drops a row with no cook, no title or no date, rather than half-showing it', () => {
    assert.equal(parseFeedItem(feedRow(1, { cook: null })), undefined);
    assert.equal(parseFeedItem(feedRow(1, { title: '  ' })), undefined);
    assert.equal(parseFeedItem(feedRow(1, { published_at: null })), undefined);
    assert.equal(parseFeedItem('nonsense'), undefined);
  });
  it('a cook with no display name goes by their handle', () => {
    const item = parseFeedItem(feedRow(1, { cook: { id: 'c', handle: 'h', display_name: null } }));
    assert.equal(item?.cook.displayName, 'h');
  });
  it('keeps the good rows of a page', () => {
    assert.equal(parseFeedPage([feedRow(1), { id: 'x' }, feedRow(2)]).length, 2);
    assert.deepEqual(parseFeedPage(null), []);
  });
});

describe('creditLine', () => {
  it('always says an AI photo is AI-generated (D-029)', () => {
    assert.equal(creditLine('AI-generated photo', 'ai'), 'AI-generated photo');
    assert.equal(creditLine(null, 'ai'), 'AI-generated photo');
    assert.equal(creditLine('Kitchen shot', 'ai'), 'AI-generated photo · Kitchen shot');
  });
  it('shows a photographer’s credit as given', () => {
    assert.equal(creditLine('Photo: Ana / Pexels', 'pexels'), 'Photo: Ana / Pexels');
    assert.equal(creditLine('', 'pexels'), undefined);
  });
});

describe('parseRecipe', () => {
  const recipe = parseRecipe(RECIPE_JSON, 'p1');
  it('maps the jsonb onto the recipe page model', () => {
    assert.ok(recipe);
    assert.equal(recipe.id, 'p1');
    assert.equal(recipe.title, 'Escabeche');
    assert.equal(recipe.servings, 4);
    assert.equal(recipe.prepMinutes + recipe.cookMinutes, 45);
    assert.deepEqual(recipe.steps, [{ text: 'Fry the fish hard and fast.' }, { text: 'Pour the hot vinegar over it.' }]);
    assert.deepEqual(recipe.notes, ['Better the next day.']);
    assert.deepEqual(recipe.seasons, ['autumn']);
  });
  it('keeps only known diets, and drops unreadable ingredient lines', () => {
    assert.deepEqual(recipe?.diets, ['pescatarian', 'no-dairy']);
    assert.equal(recipe?.ingredientGroups[0]?.items.length, 3);
    assert.deepEqual(recipe?.ingredientGroups[0]?.items[0], {
      item: 'firm white fish fillets',
      raw: '800 g firm white fish fillets',
      quantity: 800,
      unit: 'g',
      ingredientId: 'white-fish',
    });
  });
  it('an unknown unit falls back to the line’s words, so nothing scales wrongly', () => {
    const soy = recipe?.ingredientGroups[0]?.items[2];
    assert.equal(soy?.unit, undefined);
    assert.equal(soy?.quantity, undefined);
    assert.equal(soy?.raw, '2 thimbles of soy');
  });
  it('keeps a cuisine the catalogue doesn’t have', () => {
    assert.equal(parseRecipe({ ...RECIPE_JSON, cuisine: 'caribbean' }, 'p1')?.cuisine, 'caribbean');
  });
  it('refuses a recipe with no steps, no ingredients or bad times', () => {
    assert.equal(parseRecipe({ ...RECIPE_JSON, steps: [] }, 'p1'), undefined);
    assert.equal(parseRecipe({ ...RECIPE_JSON, ingredientGroups: [] }, 'p1'), undefined);
    assert.equal(parseRecipe({ ...RECIPE_JSON, prepMinutes: -5 }, 'p1'), undefined);
    assert.equal(parseRecipe({ ...RECIPE_JSON, servings: 0 }, 'p1'), undefined);
    assert.equal(parseRecipe(null, 'p1'), undefined);
  });
});

describe('parseCook', () => {
  it('reads the profile and the database’s counts', () => {
    const cook = parseCook(COOK_ROW);
    assert.equal(cook?.followerCount, 1200);
    assert.equal(cook?.homeRegion, 'Cairns, Australia');
    assert.equal(cook?.kind, 'person');
  });
  it('treats a missing or broken count as zero', () => {
    assert.equal(parseCook({ ...COOK_ROW, follower_count: null })?.followerCount, 0);
    assert.equal(parseCook({ ...COOK_ROW, recipe_count: -3 })?.recipeCount, 0);
  });
});

describe('paging', () => {
  it('gives a cursor only when the page was full', () => {
    const rows = [feedRow(1), feedRow(2)];
    assert.deepEqual(cursorAfter(rows, 2), { publishedAt: rows[1]?.published_at, id: rows[1]?.id });
    assert.equal(cursorAfter(rows, 3), undefined);
    assert.equal(cursorAfter([], 1), undefined);
  });
  it('builds the "older than" filter, with the id breaking ties', () => {
    const at = '2026-10-11T21:00:00.972276+00:00';
    const id = '0da133d7-7c10-4d55-82f7-2e45f9b821cf';
    assert.equal(olderThan({ publishedAt: at, id }), `published_at.lt."${at}",and(published_at.eq."${at}",id.lt.${id})`);
  });
  it('won’t put anything odd into the filter', () => {
    assert.equal(olderThan({ publishedAt: '2026-10-11),status.eq.removed', id: '0da133d7-7c10-4d55-82f7-2e45f9b821cf' }), undefined);
    assert.equal(olderThan({ publishedAt: '2026-10-11T21:00:00Z', id: 'x,status.eq.removed' }), undefined);
  });
  it('appends a page without repeating a recipe already shown', () => {
    const [a, b, c] = parseFeedPage([feedRow(1), feedRow(2), feedRow(3)]);
    assert.ok(a && b && c);
    assert.deepEqual(
      appendPage([a, b], [b, c]).map((i) => i.id),
      [a.id, b.id, c.id],
    );
  });
});

describe('storageUrl', () => {
  it('builds a public URL in our own project', () => {
    assert.equal(storageUrl(BASE, 'recipe-photos', 'house/abc-ai.png'), `${BASE}/storage/v1/object/public/recipe-photos/house/abc-ai.png`);
    assert.equal(storageUrl(BASE, 'recipe-photos', 'house/a b.png'), undefined);
  });
  it('refuses full URLs and paths that climb out (rule 5)', () => {
    assert.equal(storageUrl(BASE, 'avatars', 'https://evil.example/x.png'), undefined);
    assert.equal(storageUrl(BASE, 'avatars', '../secrets/x.png'), undefined);
    assert.equal(storageUrl(BASE, 'avatars', '/abs.png'), undefined);
    assert.equal(storageUrl(BASE, 'avatars', undefined), undefined);
  });
});

describe('countLabel', () => {
  it('says one and many properly', () => {
    assert.equal(countLabel(1, 'recipe', 'recipes'), '1 recipe');
    assert.equal(countLabel(1200, 'follower', 'followers'), '1,200 followers');
  });
});
