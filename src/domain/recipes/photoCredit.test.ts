import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PHOTO_SOURCES } from '../../data/catalogue/photoSources';
import { catalogue } from '../testing/fixtures';
import { isCommonsFilePage, photoCredit, photoLicence } from './photoCredit';

const PAGE = 'https://commons.wikimedia.org/wiki/File:Pancakes_with_Berries_(Unsplash).jpg';

describe('photoLicence', () => {
  it('links each Creative Commons licence to its deed', () => {
    assert.deepEqual(photoLicence('Photo: A / Wikimedia Commons (CC BY-SA 4.0)'), {
      name: 'CC BY-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    });
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC BY 2.0)')?.url, 'https://creativecommons.org/licenses/by/2.0/');
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC BY 2.5)')?.url, 'https://creativecommons.org/licenses/by/2.5/');
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC BY-SA 3.0)')?.url, 'https://creativecommons.org/licenses/by-sa/3.0/');
  });

  it('links CC0 to the public domain dedication', () => {
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC0)')?.url, 'https://creativecommons.org/publicdomain/zero/1.0/');
  });

  it('names public domain without a deed, because there is none', () => {
    assert.deepEqual(photoLicence('Photo: A / Wikimedia Commons (public domain)'), { name: 'public domain' });
  });

  it('gives no licence rather than a guessed one', () => {
    assert.equal(photoLicence('Photo: Jane Doe / Pexels'), undefined);
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC BY 9.9)'), undefined);
    assert.equal(photoLicence('Photo: A / Wikimedia Commons (CC BY-NC 4.0)'), undefined);
    assert.equal(photoLicence('AI-generated photo'), undefined);
  });

  it('reads the licence at the end, not brackets in the name', () => {
    assert.equal(photoLicence('Photo: Sam (Kitchen) / Wikimedia Commons (CC BY 4.0)')?.name, 'CC BY 4.0');
  });
});

describe('photoCredit', () => {
  it('links a Commons photo to its page and licence, and marks it as cropped', () => {
    const c = photoCredit('Photo: A / Wikimedia Commons (CC BY 4.0)', PAGE);
    assert.equal(c.page, PAGE);
    assert.equal(c.licence?.url, 'https://creativecommons.org/licenses/by/4.0/');
    assert.equal(c.adapted, true);
  });

  it('leaves an old Pexels credit as plain text', () => {
    assert.deepEqual(photoCredit('Photo: Jane Doe / Pexels', undefined), { text: 'Photo: Jane Doe / Pexels', adapted: false });
  });

  it('never links a page that is not a Commons file page', () => {
    assert.equal(photoCredit('Photo: A / Wikimedia Commons (CC0)', 'https://example.com/x.jpg').page, undefined);
    assert.equal(isCommonsFilePage('http://commons.wikimedia.org/wiki/File:X.jpg'), false);
    assert.equal(isCommonsFilePage(PAGE), true);
  });
});

describe('the catalogue’s photo credits (K-17)', () => {
  const commons = catalogue.filter((r) => r.image?.credit?.includes('/ Wikimedia Commons'));

  it('covers every Wikimedia Commons photo', () => {
    assert.equal(commons.length, 128);
    assert.equal(Object.keys(PHOTO_SOURCES).length, commons.length);
  });

  it('links every one to its file page and, unless public domain, its licence', () => {
    for (const r of commons) {
      const c = photoCredit(r.image?.credit ?? '', PHOTO_SOURCES[r.id]);
      assert.ok(c.page, `${r.id} has no file page`);
      assert.ok(c.licence, `${r.id} names no known licence`);
      if (c.licence.name !== 'public domain') assert.ok(c.licence.url, `${r.id} has no licence link`);
    }
  });

  it('only gives pages to house recipes', () => {
    const house = new Set(catalogue.filter((r) => r.source === 'house').map((r) => r.id));
    for (const id of Object.keys(PHOTO_SOURCES)) assert.ok(house.has(id), `${id} isn't a house recipe`);
  });
});
