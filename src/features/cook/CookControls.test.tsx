import { fireEvent, render, screen } from '@testing-library/react-native';

import { CookFooter } from './CookFooter';
import { CookStep } from './CookStep';

describe('CookFooter', () => {
  it('moves on, and Previous does nothing on the first step', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    await render(<CookFooter first last={false} onPrevious={onPrevious} onNext={onNext} onDone={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    expect(onPrevious).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Next step' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('finishes the cook on the last step', async () => {
    const onDone = jest.fn();
    await render(<CookFooter first={false} last onPrevious={jest.fn()} onNext={jest.fn()} onDone={onDone} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Finish cooking' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('CookStep', () => {
  it('starts a timer from a time in the step, then counts down in the chip', async () => {
    // A fixed clock, so the chip's own countdown reads exactly 20:00.
    jest.spyOn(Date, 'now').mockReturnValue(0);
    const onStartTimer = jest.fn();
    const view = await render(<CookStep text="Rest 20 minutes." step={7} timers={[]} onStartTimer={onStartTimer} />);
    expect(screen.getByText('08', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start a 20 minutes timer' }));
    expect(onStartTimer).toHaveBeenCalledWith('20 minutes', 1200);
    const timer = { id: 't', label: '20 minutes', stepIndex: 7, seconds: 1200, endsAt: 1_200_000 };
    await view.rerender(<CookStep text="Rest 20 minutes." step={7} timers={[timer]} onStartTimer={onStartTimer} />);
    expect(screen.queryByRole('button', { name: 'Start a 20 minutes timer' })).toBeNull();
    expect(screen.getByLabelText('20 minutes timer, 20:00 left')).toBeTruthy();
  });
});
