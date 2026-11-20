import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { buildRecipe } from './draft';
import { cleanText, extractRecipe, minutesFromDuration, normaliseLink, sourceLink } from './importLink';

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

describe('character codes that are not characters (BUG-24)', () => {
  it('keeps the entity as written instead of throwing', () => {
    assert.equal(cleanText('Pie &#9999999999;'), 'Pie &#9999999999;');
    assert.equal(cleanText('Caf&#233;'), 'Café');
    assert.equal(cleanText('&#x110000;'), '&#x110000;');
  });
});

describe('sourceLink', () => {
  it('names the site without www and keeps the full link', () => {
    assert.deepEqual(sourceLink('https://www.bbcgoodfood.com/recipes/pie?x=1'), {
      host: 'bbcgoodfood.com',
      url: 'https://www.bbcgoodfood.com/recipes/pie?x=1',
    });
    assert.equal(sourceLink('  http://recipetineats.com/a  ')?.host, 'recipetineats.com');
  });

  it('gives no credit for a missing, malformed or unsafe link', () => {
    for (const bad of [undefined, '', '   ', 'not a url', 'bbcgoodfood.com/pie', 'javascript:alert(1)', 'ftp://site.com/x', 'https://localhost/x']) {
      assert.equal(sourceLink(bad), undefined, String(bad));
    }
  });
});
