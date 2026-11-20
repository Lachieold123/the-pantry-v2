import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { agreementLinks } from './legal';

const terms = 'https://example.com/terms';
const privacy = 'https://example.com/privacy';

describe('what the welcome asks the cook to agree to', () => {
  it('is nothing until the terms are published', () => {
    assert.deepEqual(agreementLinks({}), []);
    assert.deepEqual(agreementLinks({ privacy }), []);
  });

  it('is the terms, then the privacy policy once that is published too', () => {
    assert.deepEqual(
      agreementLinks({ terms }).map((l) => l.label),
      ['Terms of use'],
    );
    assert.deepEqual(
      agreementLinks({ terms, privacy, support: 'https://example.com/help' }).map((l) => l.label),
      ['Terms of use', 'Privacy policy'],
    );
  });

  it('never links to a page that isn’t https', () => {
    assert.deepEqual(agreementLinks({ terms: 'http://example.com/terms' }), []);
  });
});
