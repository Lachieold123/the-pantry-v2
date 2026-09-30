import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { buildRecipe } from './draft';
import { cleanText, extractRecipe, MAX_MINUTES, MAX_PAGE_CHARS, minutesFromDuration, normaliseLink } from './importLink';

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
  });
  it('upgrades http to https, which is all iOS will fetch (audit F65)', () => {
    assert.equal(normaliseLink('http://example.com'), 'https://example.com/');
    assert.equal(normaliseLink('HTTP://example.com/pie'), 'https://example.com/pie');
  });
  it('drops a login and tracking tags, since the link is kept on the recipe (audit F65)', () => {
    assert.equal(normaliseLink('https://me:secret@example.com/pie'), 'https://example.com/pie');
    assert.equal(normaliseLink('example.com/pie?utm_source=ig&UTM_Medium=x&fbclid=1&gclid=2&page=2'), 'https://example.com/pie?page=2');
    assert.equal(normaliseLink('example.com/pie?utm_source=ig'), 'https://example.com/pie');
  });
  it('rejects things that aren’t links', () => {
    assert.equal(normaliseLink('chicken pie'), undefined);
    assert.equal(normaliseLink('localhost'), undefined);
    assert.equal(normaliseLink(''), undefined);
  });
});

describe('extractRecipe: the shapes sites really use (audit F59)', () => {
  const base = { '@type': 'Recipe', name: 'Stew', recipeIngredient: ['1 onion'], recipeInstructions: 'Cook it.' };

  it('works out the cook time from prep and total', () => {
    const draft = extractRecipe(page({ ...base, prepTime: 'PT15M', totalTime: 'PT1H' }));
    assert.equal(draft?.prepMinutes, 15);
    assert.equal(draft?.cookMinutes, 45);
  });

  it('reads the prep time from cook and total, and a total alone as cooking', () => {
    const fromCook = extractRecipe(page({ ...base, cookTime: 'PT40M', totalTime: 'PT1H' }));
    assert.deepEqual([fromCook?.prepMinutes, fromCook?.cookMinutes], [20, 40]);
    const totalOnly = extractRecipe(page({ ...base, totalTime: 'PT30M' }));
    assert.deepEqual([totalOnly?.prepMinutes, totalOnly?.cookMinutes], [0, 30]);
  });

  it('recognises prefixed and URL recipe types, but not other types ending in the word', () => {
    assert.equal(extractRecipe(page({ ...base, '@type': 'schema:Recipe' }))?.title, 'Stew');
    assert.equal(extractRecipe(page({ ...base, '@type': 'http://schema.org/Recipe' }))?.title, 'Stew');
    assert.equal(extractRecipe(page({ ...base, '@type': 'NotARecipe' })), undefined);
  });

  it('finds a recipe in a mainEntity list', () => {
    assert.equal(extractRecipe(page({ '@type': 'WebPage', mainEntity: [{ '@type': 'Person' }, base] }))?.title, 'Stew');
  });

  it('reads JSON with raw newlines inside strings', () => {
    const html =
      '<script type="application/ld+json">{"@type":"Recipe","name":"Stew","description":"Warm\nand good","recipeIngredient":["1 onion"],"recipeInstructions":"Cook"}</script>';
    assert.equal(extractRecipe(html)?.summary, 'Warm and good');
  });

  it('splits one numbered instruction string into steps', () => {
    const draft = extractRecipe(
      page({ ...base, recipeInstructions: 'You need a big pot. 1. Heat oven to 180C. 2. Mix 1.5 cups. 3. Bake.' }),
    );
    assert.equal(draft?.methodText, 'You need a big pot.\n1. Heat oven to 180C.\n2. Mix 1.5 cups.\n3. Bake.');
  });

  it('leaves a string alone when its numbers don’t count up from 1', () => {
    const draft = extractRecipe(page({ ...base, recipeInstructions: 'Rest for 2. Then 5. Serve.' }));
    assert.equal(draft?.methodText, 'Rest for 2. Then 5. Serve.');
  });

  it('clamps an absurd time so the recipe can still be saved', () => {
    const draft = extractRecipe(page({ ...base, recipeCuisine: 'Italian', prepTime: 'PT720H', cookTime: 'PT1H' }));
    assert.equal(draft?.prepMinutes, MAX_MINUTES);
    assert.ok(draft);
    assert.ok(buildRecipe('my-stew-1', draft, 'imported', index).recipe);
  });
});

describe('minutesFromDuration: wider forms (audit F59)', () => {
  it('reads years, months and weeks slots and fractional seconds', () => {
    assert.equal(minutesFromDuration('P0Y0M0DT0H35M0.000S'), 35);
    assert.equal(minutesFromDuration('pt1h30m'), 90);
    assert.equal(minutesFromDuration('P1W'), MAX_MINUTES);
    assert.equal(minutesFromDuration('PT90S'), 2);
    assert.equal(minutesFromDuration('P'), undefined);
  });
});

describe('import hardening (audit F63, F64)', () => {
  it('drops numeric entities outside Unicode instead of throwing', () => {
    assert.equal(cleanText('Beef &#99999999; stew &#x110000;'), 'Beef stew');
    assert.equal(
      extractRecipe(page({ '@type': 'Recipe', name: 'Beef &#99999999; stew', recipeIngredient: ['1 egg'] }))?.title,
      'Beef stew',
    );
  });

  it('never reads entity names off Object.prototype', () => {
    assert.equal(cleanText('Salt &constructor; &toString;'), 'Salt &constructor; &toString;');
  });

  it('stops reading past the size cap', () => {
    const late = `${' '.repeat(MAX_PAGE_CHARS)}${page({ '@type': 'Recipe', name: 'Late', recipeIngredient: ['1 egg'] })}`;
    assert.equal(extractRecipe(late), undefined);
  });

  it('stays fast on hostile pages', () => {
    const hostile = [
      '<script type="application/ld+json">'.repeat(40_000),
      '<script '.repeat(40_000),
      page({ '@type': 'Recipe', name: '<'.repeat(80_000), recipeInstructions: '<p'.repeat(80_000) }),
    ];
    const start = performance.now();
    for (const html of hostile) extractRecipe(html);
    cleanText('<'.repeat(80_000));
    // These took 10 to 40 seconds each with the old regexes.
    assert.ok(performance.now() - start < 1000, `took ${Math.round(performance.now() - start)} ms`);
  });
});
