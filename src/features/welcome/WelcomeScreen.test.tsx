import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEFAULT_SHELF } from '@/domain/cupboard/cookable';
import { toISODate } from '@/domain/plan/week';
import { useChecklist } from '@/store/checklist';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { WelcomeScreen } from './WelcomeScreen';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
const mockReminder = jest.fn(async (on: boolean) => on);
jest.mock('@/lib/notifications', () => ({
  setSundayReminder: (on: boolean) => mockReminder(on),
  SUNDAY_REMINDER_TEXT: { title: 'Plan the week?', body: 'Pick a few dinners.' },
}));

const NOTHING = { options: [], custom: [] };
const LEGAL = [
  { label: 'Terms of use', url: 'https://example.com/terms' },
  { label: 'Privacy policy', url: 'https://example.com/privacy' },
];
const next = () => fireEvent.press(screen.getByTestId('welcome-next'));

beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState({
    onboarded: false,
    diet: 'everything',
    avoid: NOTHING,
    cuisines: ['italian'],
    weeknight: 'under-30',
    intents: [],
    skill: undefined,
    termsAcceptedAt: undefined,
    sundayReminder: false,
  });
  useCupboard.setState({ items: [], shelf: DEFAULT_SHELF });
  usePlan.setState({ entries: [] });
  useChecklist.setState({ started: false, dismissed: false });
});

/** From hello to a question: 0 = what brings you here, 1 = eat, 2 = cuisines, 3 = time, 4 = cupboard, 5 = reveal. */
async function openAt(question: number) {
  await render(<WelcomeScreen legal={[]} />);
  await fireEvent.press(screen.getByTestId('welcome-start'));
  for (let i = 0; i < question; i++) await next();
}

describe('WelcomeScreen', () => {
  it('opens on the hello page, and Skip goes straight to the app with the checklist started', async () => {
    await render(<WelcomeScreen legal={[]} />);
    expect(screen.getByText('The Pantry')).toBeTruthy();
    expect(screen.queryByTestId('welcome-consent')).toBeNull();
    await fireEvent.press(screen.getByTestId('welcome-skip'));
    expect(usePreferences.getState().onboarded).toBe(true);
    expect(useChecklist.getState().started).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(useCupboard.getState().items).toEqual([]);
  });

  it('asks for the published terms first, and both ways in wait for the tick', async () => {
    await render(<WelcomeScreen legal={LEGAL} />);
    expect(screen.getByText('Terms of use')).toBeTruthy();
    expect(screen.getByTestId('welcome-start').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('welcome-skip'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('welcome-consent'));
    await fireEvent.press(screen.getByTestId('welcome-start'));
    expect(usePreferences.getState().termsAcceptedAt).toEqual(expect.any(Number));
    expect(screen.getByText('What brings you here?')).toBeTruthy();
  });

  it('doesn’t ask for the terms again on a redo', async () => {
    usePreferences.setState({ onboarded: true, termsAcceptedAt: 1 });
    await render(<WelcomeScreen legal={LEGAL} />);
    expect(screen.queryByTestId('welcome-consent')).toBeNull();
  });

  it('saves what you came for, what you eat, the cuisines, the time and the skill as they’re tapped', async () => {
    await openAt(0);
    await fireEvent.press(screen.getByTestId('intent-household'));
    await fireEvent.press(screen.getByTestId('intent-plan'));
    expect(usePreferences.getState().intents).toEqual(['plan', 'household']);
    await next();
    expect(screen.getByText('None of these')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('diet-vegetarian'));
    await fireEvent.press(screen.getByTestId('avoid-nuts'));
    expect(screen.getByText('Continue')).toBeTruthy();
    await next();
    await fireEvent.press(screen.getByTestId('cuisine-thai'));
    await next();
    expect(screen.getByText('How long do you have?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('weeknight-any'));
    await fireEvent.press(screen.getByTestId('skill-starting'));
    expect(usePreferences.getState()).toMatchObject({
      diet: 'vegetarian',
      avoid: { options: ['nuts'] },
      cuisines: ['italian', 'thai'],
      weeknight: undefined,
      skill: 'starting',
    });
    // A second tap on the skill clears it.
    await fireEvent.press(screen.getByTestId('skill-starting'));
    expect(usePreferences.getState().skill).toBeUndefined();
  });

  it('fills the cupboard, plans the chosen pick for tonight, turns on the reminder and lands on What I have', async () => {
    await openAt(4);
    expect(screen.getByText('What’s in your cupboard?')).toBeTruthy();
    expect(screen.getByText('Tap what you have')).toBeTruthy();
    for (const id of ['garlic', 'egg', 'chicken-thigh']) await fireEvent.press(screen.getByTestId(`welcome-cupboard-${id}`));
    expect(screen.getByText('3 things')).toBeTruthy();
    await next();
    expect(
      useCupboard
        .getState()
        .items.map((i) => i.ingredientId)
        .sort(),
    ).toEqual(['chicken-thigh', 'egg', 'garlic']);

    expect(screen.getByText(/Tonight,/)).toBeTruthy();
    const picks = screen.getAllByTestId(/^welcome-pick-/);
    expect(picks).toHaveLength(3);
    const second = picks[1]!.props.testID.replace('welcome-pick-', '');
    await fireEvent.press(picks[1]!);
    await next();
    expect(usePlan.getState().entries).toMatchObject([{ recipeId: second, day: toISODate(new Date()), slot: 'dinner' }]);

    expect(screen.getByText(/A nudge when/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('welcome-allow'));
    expect(mockReminder).toHaveBeenCalledWith(true);
    expect(usePreferences.getState()).toMatchObject({ sundayReminder: true, onboarded: true });
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/', params: { show: 'pantry' } });
  });

  it('spins for three more, and "Not tonight" and "Maybe later" plan and ask nothing', async () => {
    await openAt(5);
    const first = screen.getAllByTestId(/^welcome-pick-/).map((p) => p.props.testID);
    await fireEvent.press(screen.getByTestId('welcome-spin'));
    const second = screen.getAllByTestId(/^welcome-pick-/).map((p) => p.props.testID);
    expect(second.some((id) => first.includes(id))).toBe(false);
    await fireEvent.press(screen.getByTestId('welcome-not-tonight'));
    await fireEvent.press(screen.getByTestId('welcome-later'));
    expect(usePlan.getState().entries).toEqual([]);
    expect(mockReminder).not.toHaveBeenCalled();
    expect(usePreferences.getState().onboarded).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('says plainly when notifications are refused', async () => {
    mockReminder.mockResolvedValueOnce(false);
    await openAt(5);
    await fireEvent.press(screen.getByTestId('welcome-not-tonight'));
    await fireEvent.press(screen.getByTestId('welcome-allow'));
    expect(usePreferences.getState().sundayReminder).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({ message: expect.stringContaining('Notifications are off') });
  });

  it('skips the primer when the Sunday reminder is already on', async () => {
    usePreferences.setState({ sundayReminder: true });
    await openAt(5);
    await fireEvent.press(screen.getByTestId('welcome-not-tonight'));
    expect(screen.queryByTestId('welcome-notify')).toBeNull();
    expect(usePreferences.getState().onboarded).toBe(true);
  });

  it('offers only what this cook eats, and Back keeps the answers', async () => {
    await openAt(1);
    await fireEvent.press(screen.getByTestId('diet-vegetarian'));
    for (let i = 0; i < 3; i++) await next();
    expect(screen.queryByTestId('welcome-cupboard-chicken-thigh')).toBeNull();
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByTestId('welcome-back'));
    expect(screen.getByTestId('diet-vegetarian').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('a redo keeps earlier answers, and only offers what isn’t in the cupboard yet', async () => {
    usePreferences.setState({ onboarded: true, diet: 'pescatarian', skill: 'confident' });
    useCupboard.setState({ items: [{ ingredientId: 'garlic', addedAt: 1, source: 'manual' }] });
    await openAt(1);
    expect(screen.getByTestId('diet-pescatarian').props.accessibilityState).toMatchObject({ checked: true });
    await next();
    await next();
    expect(screen.getByTestId('skill-confident').props.accessibilityState).toMatchObject({ checked: true });
    await next();
    expect(screen.queryByTestId('welcome-cupboard-garlic')).toBeNull();
    await fireEvent.press(screen.getByTestId('welcome-cupboard-egg'));
    await next();
    expect(useCupboard.getState().items.map((i) => i.ingredientId)).toEqual(['garlic', 'egg']);
    expect(usePreferences.getState()).toMatchObject({ cuisines: ['italian'], weeknight: 'under-30' });
  });

  it('Skip for now on the cupboard step adds nothing and moves on to the reveal', async () => {
    await openAt(4);
    await fireEvent.press(screen.getByTestId('welcome-cupboard-egg'));
    await fireEvent.press(screen.getByTestId('welcome-cupboard-skip'));
    expect(useCupboard.getState().items).toEqual([]);
    expect(screen.getAllByTestId(/^welcome-pick-/).length).toBeGreaterThan(0);
  });
});
