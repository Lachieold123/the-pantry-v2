// VoiceOver on iPhone ignores live regions, so changes are spoken through
// announce() (audit F97). These pin when it speaks and when it stays quiet.
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useAnnounce } from './announce';

const spoken = jest.mocked(AccessibilityInfo.announceForAccessibility);

function Speaker({ message, delayMs, initial }: { message: string | null; delayMs?: number; initial?: boolean }) {
  useAnnounce(message, { ...(delayMs !== undefined ? { delayMs } : {}), ...(initial !== undefined ? { initial } : {}) });
  return null;
}

beforeEach(() => {
  spoken.mockClear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test('says each change, but not what was already on screen when it opened', async () => {
  const view = await render(<Speaker message="Step 1 of 4" />);
  expect(spoken).not.toHaveBeenCalled();
  await view.rerender(<Speaker message="Step 2 of 4" />);
  expect(spoken).toHaveBeenLastCalledWith('Step 2 of 4');
  await view.rerender(<Speaker message={null} />);
  expect(spoken).toHaveBeenCalledTimes(1);
});

test('speaks the first value when asked, for errors that arrive with the view', async () => {
  await render(<Speaker message="Name: add a name" initial />);
  expect(spoken).toHaveBeenCalledWith('Name: add a name');
});

test('waits for typing to settle and says only the last count', async () => {
  const view = await render(<Speaker message="40 recipes" delayMs={800} />);
  await view.rerender(<Speaker message="12 recipes" delayMs={800} />);
  await view.rerender(<Speaker message="3 recipes" delayMs={800} />);
  expect(spoken).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(800);
  });
  expect(spoken).toHaveBeenCalledTimes(1);
  expect(spoken).toHaveBeenCalledWith('3 recipes');
});
