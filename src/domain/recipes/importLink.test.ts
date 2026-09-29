import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { buildRecipe } from './draft';
import { cleanText, extractRecipe, minutesFromDuration, normaliseLink } from './importLink';

const page = (jsonld: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(jsonld)}</script></head><body>ads</body></html>`;

const RECIPE = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Chicken &amp; leek pie',
  description: 'A <b>proper</b> weeknight pie.',
  recipeCuisine: 'British',
  recipeCategory: 'Main course',
  recipeYield: ['6', '6 servings'],
  prepTime: 'PT20M',
  cookTime: 'PT1H10M',
  recipeIngredient: ['500g chicken thigh fillets', '2 leeks, sliced', '1 sheet puff pastry'],
  recipeInstructions: [
    { '@type': 'HowToSection', name: 'Filling', itemListElement: [{ '@type': 'HowToStep', text: 'Brown the chicken.' }] },
    { '@type': 'HowToStep', text: 'Top with pastry and bake.' },
  ],
};

describe('extractRecipe', () => {
  it('reads a schema.org recipe into a draft', () => {
    const draft = extractRecipe(page(RECIPE));
    assert.ok(draft);
    assert.equal(draft.title, 'Chicken & leek pie');
    assert.equal(draft.summary, 'A proper weeknight pie.');
    assert.equal(draft.cuisine, 'british');
    assert.deepEqual(draft.mealTypes, ['dinner']);
    assert.equal(draft.servings, 6);
    assert.equal(draft.prepMinutes, 20);
    assert.equal(draft.cookMinutes, 70);
    assert.equal(draft.methodText, 'Brown the chicken.\nTop with pastry and bake.');
  });

  it('finds a recipe inside an @graph, alongside other page data', () => {
    const draft = extractRecipe(page({ '@graph': [{ '@type': 'WebPage' }, { ...RECIPE, '@type': ['Recipe', 'NewsArticle'] }] }));
    assert.equal(draft?.title, 'Chicken & leek pie');
  });

  it('skips broken JSON and pages with no recipe', () => {
    assert.equal(extractRecipe('<script type="application/ld+json">{not json</script>'), undefined);
    assert.equal(extractRecipe(page({ '@type': 'Article', name: 'Ten tips' })), undefined);
  });

  it('splits one long HTML instruction string into steps', () => {
    const draft = extractRecipe(page({ ...RECIPE, recipeInstructions: '<p>Chop.</p><p>Fry.</p>' }));
    assert.equal(draft?.methodText, 'Chop.\nFry.');
  });

  it('leaves the cuisine for the cook to pick when the site’s label is unknown', () => {
    const draft = extractRecipe(page({ ...RECIPE, recipeCuisine: 'Fusion' }));
    assert.equal(draft?.cuisine, undefined);
  });

  it('builds into a real recipe once parsed', () => {
    const draft = extractRecipe(page(RECIPE));
    assert.ok(draft);
    assert.ok(buildRecipe('my-pie-1', draft, 'imported', index).recipe);
  });
});

describe('minutesFromDuration', () => {
  it('reads the forms sites use', () => {
    assert.equal(minutesFromDuration('PT1H30M'), 90);
    assert.equal(minutesFromDuration('PT90M'), 90);
    assert.equal(minutesFromDuration('P0DT0H20M'), 20);
    assert.equal(minutesFromDuration('PT'), undefined);
    assert.equal(minutesFromDuration('20 mins'), undefined);
  });
});

describe('cleanText', () => {
  it('decodes entities and drops tags', () => {
    assert.equal(cleanText('Salt &amp; pepper&#8217;s <i>best</i>&nbsp;friend'), 'Salt & pepper’s best friend');
  });
});

describe('normaliseLink', () => {
  it('accepts pasted links with or without https', () => {
    assert.equal(normaliseLink(' www.example.com/pie '), 'https://www.example.com/pie');
    assert.equal(normaliseLink('http://example.com'), 'http://example.com/');
  });
  it('rejects things that aren’t links', () => {
    assert.equal(normaliseLink('chicken pie'), undefined);
    assert.equal(normaliseLink('localhost'), undefined);
    assert.equal(normaliseLink(''), undefined);
  });
});
