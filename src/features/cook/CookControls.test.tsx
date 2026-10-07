import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { CookFooter } from './CookFooter';
import { CookStep } from './CookStep';
import { TimerBar } from './TimerBar';

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
    const onStartTimer = jest.fn();
    const view = await render(<CookStep text="Rest 20 minutes." step={7} timers={[]} now={0} onStartTimer={onStartTimer} />);
    expect(screen.getByText('08', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start a 20 minutes timer' }));
    expect(onStartTimer).toHaveBeenCalledWith('20 minutes', 1200);
    const timer = { id: 't', label: '20 minutes', stepIndex: 7, seconds: 1200, endsAt: 1_200_000 };
    await view.rerender(<CookStep text="Rest 20 minutes." step={7} timers={[timer]} now={0} onStartTimer={onStartTimer} />);
    expect(screen.queryByRole('button', { name: 'Start a 20 minutes timer' })).toBeNull();
    expect(screen.getByLabelText('20 minutes timer, 20:00 left')).toBeTruthy();
  });
});

describe('TimerBar', () => {
  // In the app the notification banner doesn't help a VoiceOver user; the bar says it (audit 2026-10-07).
  it('tells VoiceOver when a timer runs out, once', async () => {
    const spoken = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const timer = { id: 't1', label: '20 minutes', stepIndex: 2, seconds: 1200, endsAt: 10_000 };
    const view = await render(<TimerBar timers={[timer]} now={5_000} onDismiss={jest.fn()} />);
    expect(spoken).not.toHaveBeenCalled();
    await view.rerender(<TimerBar timers={[timer]} now={10_000} onDismiss={jest.fn()} />);
    await view.rerender(<TimerBar timers={[timer]} now={10_500} onDismiss={jest.fn()} />);
    expect(spoken).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveBeenCalledWith('Time’s up: 20 minutes, step 3');
    spoken.mockRestore();
  });
});
