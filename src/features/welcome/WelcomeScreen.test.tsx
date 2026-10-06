import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEFAULT_SHELF } from '@/domain/cupboard/cookable';
import { useCupboard } from '@/store/cupboard';
import { usePreferences } from '@/store/preferences';
import { WelcomeScreen } from './WelcomeScreen';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const NOTHING = { options: [], custom: [] };

beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState({ onboarded: false, diet: 'everything', avoid: NOTHING, cuisines: ['italian'], weeknight: 'under-30' });
  useCupboard.setState({ items: [], shelf: DEFAULT_SHELF });
});

async function toEat() {
  await render(<WelcomeScreen />);
  await fireEvent.press(screen.getByTestId('welcome-start'));
}

describe('WelcomeScreen', () => {
  it('opens on the hello page, and Skip goes straight to the app', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByText('The Pantry')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('welcome-skip'));
    expect(usePreferences.getState().onboarded).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(useCupboard.getState().items).toEqual([]);
  });

  it('asks what you don’t eat, with an obvious "None of these" when nothing is ruled out', async () => {
    await toEat();
    expect(screen.getByText('Anything you don’t eat?')).toBeTruthy();
    expect(screen.getByText('None of these')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('diet-vegetarian'));
    await fireEvent.press(screen.getByTestId('avoid-nuts'));
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(usePreferences.getState()).toMatchObject({ diet: 'vegetarian', avoid: { options: ['nuts'] } });
  });

  it('fills the cupboard from a few taps and lands on Home', async () => {
    await toEat();
    await fireEvent.press(screen.getByTestId('welcome-next'));
    expect(screen.getByText('What’s in your cupboard?')).toBeTruthy();
    expect(screen.getByText('Tap what you have')).toBeTruthy();
    for (const id of ['garlic', 'egg', 'chicken-thigh']) await fireEvent.press(screen.getByTestId(`welcome-cupboard-${id}`));
    expect(screen.getByText('3 things')).toBeTruthy();
    // A second tap untoggles.
    await fireEvent.press(screen.getByTestId('welcome-cupboard-egg'));
    expect(screen.getByText('2 things')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('welcome-cupboard-egg'));
    await fireEvent.press(screen.getByTestId('welcome-finish'));
    const items = useCupboard.getState().items;
    expect(items.map((i) => i.ingredientId).sort()).toEqual(['chicken-thigh', 'egg', 'garlic']);
    expect(items.every((i) => i.source === 'manual')).toBe(true);
    expect(usePreferences.getState().onboarded).toBe(true);
    // Home opens on What I have, even when the picks can't make a whole dish yet.
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/', params: { show: 'pantry' } });
  });

  it('won’t "show what I can cook" from an empty pick, and Skip for now still finishes', async () => {
    await toEat();
    await fireEvent.press(screen.getByTestId('welcome-next'));
    await fireEvent.press(screen.getByTestId('welcome-finish'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('welcome-cupboard-skip'));
    expect(usePreferences.getState().onboarded).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(useCupboard.getState().items).toEqual([]);
  });

  it('offers only what this cook eats, and Back keeps the answers', async () => {
    await toEat();
    await fireEvent.press(screen.getByTestId('diet-vegetarian'));
    await fireEvent.press(screen.getByTestId('welcome-next'));
    expect(screen.queryByTestId('welcome-cupboard-chicken-thigh')).toBeNull();
    await fireEvent.press(screen.getByTestId('welcome-back'));
    expect(screen.getByTestId('diet-vegetarian').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('a redo keeps earlier answers and settings, and only offers what isn’t in the cupboard yet', async () => {
    usePreferences.setState({ onboarded: true, diet: 'pescatarian' });
    useCupboard.setState({ items: [{ ingredientId: 'garlic', addedAt: 1, source: 'manual' }] });
    await toEat();
    expect(screen.getByTestId('diet-pescatarian').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByTestId('welcome-next'));
    expect(screen.queryByTestId('welcome-cupboard-garlic')).toBeNull();
    await fireEvent.press(screen.getByTestId('welcome-cupboard-egg'));
    await fireEvent.press(screen.getByTestId('welcome-finish'));
    expect(useCupboard.getState().items.map((i) => i.ingredientId)).toEqual(['garlic', 'egg']);
    // Cuisines and weeknight time aren't asked any more, and aren't wiped either.
    expect(usePreferences.getState()).toMatchObject({ cuisines: ['italian'], weeknight: 'under-30' });
  });
});
