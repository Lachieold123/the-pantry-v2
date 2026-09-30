import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { anyRunning, isRunningAlready, startTimer, timerNotice } from './timers';

describe('timer helpers', () => {
  const pasta = startTimer('a', '10 minutes', 3, 600, 0);

  it('knows when a timer is still running', () => {
    assert.equal(anyRunning([pasta], 1000), true);
    assert.equal(anyRunning([pasta], 600_000), false);
    assert.equal(anyRunning([], 0), false);
  });

  it('spots a repeat start for the same step and time, but not once it has finished', () => {
    assert.equal(isRunningAlready([pasta], 3, '10 minutes', 1000), true);
    assert.equal(isRunningAlready([pasta], 4, '10 minutes', 1000), false);
    assert.equal(isRunningAlready([pasta], 3, '2 minutes', 1000), false);
    assert.equal(isRunningAlready([pasta], 3, '10 minutes', 600_000), false);
  });

  it('names the step and quotes what it was doing', () => {
    assert.deepEqual(timerNotice(3, '8–10 minutes', 'Simmer the lentils for 8–10 minutes.'), {
      title: 'Step 4 timer done',
      body: 'Simmer the lentils for 8–10 minutes.',
    });
  });

  it('shortens a long step at a word', () => {
    const long = `Add the stock and simmer gently, stirring now and then, ${'until the sauce is thick and glossy '.repeat(3)}`;
    const { body } = timerNotice(0, '20 minutes', long);
    assert.ok(body.length <= 91, body);
    assert.ok(body.endsWith('…'));
    assert.ok(!body.includes('  '));
  });

  it('falls back to the time when the step has no text', () => {
    assert.equal(timerNotice(0, '5 minutes', '  ').body, '5 minutes is up');
  });
});
