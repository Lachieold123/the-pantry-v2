import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { logger, setLogSink, type LogSink } from './logger';

describe('logger', () => {
  it('sends warnings and errors to the current sink with their scope and cause', () => {
    const seen: Parameters<LogSink>[] = [];
    const previous = setLogSink((...args) => seen.push(args));
    const cause = new Error('boom');
    logger.warn('share', "couldn't open", cause);
    logger.error('screen', 'crashed');
    setLogSink(previous);
    assert.deepEqual(seen, [
      ['warn', 'share', "couldn't open", cause],
      ['error', 'screen', 'crashed', undefined],
    ]);
  });
  it('restoring the previous sink stops sending to the spy', () => {
    const seen: unknown[] = [];
    const previous = setLogSink(() => seen.push(1));
    setLogSink(previous);
    const again = setLogSink(() => undefined);
    setLogSink(again);
    assert.equal(seen.length, 0);
  });
});
