import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { View } from 'react-native';

import { useTour, useTourTarget } from '@/store/tour';
import { TOUR } from '@/ui/tokens/screens';
import { TOUR_STEPS } from './steps';
import { TourOverlay } from './TourOverlay';

type Reading = [x: number, y: number, width: number, height: number];

/** Stands in for Home's switch: each measurement returns the next reading, then repeats the last. */
function FakeTarget({ readings }: { readings: Reading[] }) {
  const ref = useTourTarget('home-pantry');
  useEffect(() => {
    const node = {
      measureInWindow: (done: (...r: Reading) => void) => done(...(readings.length > 1 ? readings.shift()! : readings[0]!)),
    };
    ref(node as unknown as View);
    return () => {
      ref(null);
    };
  }, [ref, readings]);
  return null;
}

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
      // Skip is on every stop before the last.
      expect(screen.getByTestId('tour-skip')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('tour-next'));
      expect(screen.getByText(TOUR_STEPS[i]!.title)).toBeTruthy();
    }
    // On the last stop, "Start cooking" ends it, so Skip would say the same thing.
    expect(screen.queryByTestId('tour-skip')).toBeNull();
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

  it('shows the card only once its target has stopped moving, so it never jumps', async () => {
    jest.useFakeTimers();
    useTour.setState({ seen: false, step: 0 });
    // Home is still laying out: the switch moves once, then holds still.
    await render(
      <>
        <FakeTarget
          readings={[
            [16, 120, 300, 80],
            [16, 180, 300, 80],
            [16, 180, 300, 80],
          ]}
        />
        <TourOverlay />
      </>,
    );
    await act(async () => {});
    // Measuring: the screen is dimmed, but there's no card to jump yet.
    expect(screen.getByTestId('tour')).toBeTruthy();
    expect(screen.queryByText('What I have')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(TOUR.settleEvery);
    });
    expect(screen.queryByText('What I have')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(TOUR.settleEvery);
    });
    expect(screen.getByText('What I have')).toBeTruthy();
    jest.useRealTimers();
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
