import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { longDate, weekRange } from './dates';

describe('dates as the cook reads them', () => {
  it('writes a long date', () => {
    assert.equal(longDate(new Date(2026, 8, 30)), 'Wednesday 30 September');
  });
  it('writes a week across two months with both months', () => {
    assert.equal(weekRange(new Date(2026, 8, 28)), '28 Sep – 4 Oct');
  });
  it('writes a week inside one month with the month once', () => {
    assert.equal(weekRange(new Date(2026, 9, 5)), '5 – 11 Oct');
  });
  it('crosses the year', () => {
    assert.equal(weekRange(new Date(2026, 11, 28)), '28 Dec – 3 Jan');
  });
});
