import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useTour } from '@/store/tour';
import { TOUR_STEPS } from './steps';
import { TourOverlay } from './TourOverlay';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => useTour.setState({ seen: false, step: undefined }));

// Its saved state loads asynchronously; let that settle inside act before asserting.
async function show() {
  await render(<TourOverlay />);
  await act(async () => {});
}

describe('TourOverlay', () => {
  it('walks the four stops and is seen once finished', async () => {
    useTour.setState({ seen: false, step: 0 });
    await show();
    expect(screen.getByText('What I have')).toBeTruthy();
    expect(screen.getByText(`1 of ${TOUR_STEPS.length}`)).toBeTruthy();
    for (let i = 1; i < TOUR_STEPS.length; i++) {
      await fireEvent.press(screen.getByTestId('tour-next'));
      expect(screen.getByText(TOUR_STEPS[i]!.title)).toBeTruthy();
    }
    // Skip stays on screen to the end.
    expect(screen.getByTestId('tour-skip')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tour-done'));
    expect(useTour.getState()).toMatchObject({ seen: true, step: undefined });
    expect(screen.queryByTestId('tour')).toBeNull();
  });

  it('skips from any stop, and counts as seen', async () => {
    useTour.setState({ seen: false, step: 1 });
    await show();
    await fireEvent.press(screen.getByTestId('tour-skip'));
    expect(useTour.getState()).toMatchObject({ seen: true, step: undefined });
  });

  it('starts by itself once it has loaded', async () => {
    jest.useFakeTimers();
    await show();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(useTour.getState().step).toBe(0);
    jest.useRealTimers();
  });

  it('does not start again after it has been seen', async () => {
    useTour.setState({ seen: true, step: undefined });
    jest.useFakeTimers();
    await show();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(useTour.getState().step).toBeUndefined();
    jest.useRealTimers();
  });
});
