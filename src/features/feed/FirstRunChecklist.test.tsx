import { fireEvent, render, screen } from '@testing-library/react-native';

import { useChecklist } from '@/store/checklist';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useSaved } from '@/store/saved';
import { FirstRunChecklist } from './FirstRunChecklist';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.clearAllMocks();
  useChecklist.setState({ started: true, dismissed: false });
  usePreferences.setState({ intents: [] });
  useCupboard.setState({ items: [] });
  usePlan.setState({ entries: [] });
  useSaved.setState({ bookmarks: [] });
  useCookLog.setState({ log: [] });
});

describe('FirstRunChecklist', () => {
  it('stays hidden until the welcome starts it', async () => {
    useChecklist.setState({ started: false });
    await render(<FirstRunChecklist />);
    expect(screen.queryByTestId('checklist')).toBeNull();
  });

  it('lists four steps, each opening where it’s done', async () => {
    await render(<FirstRunChecklist />);
    expect(screen.getByText('0/4')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('checklist-cupboard'));
    expect(mockRouter.push).toHaveBeenCalledWith('/cupboard');
    await fireEvent.press(screen.getByTestId('checklist-cook'));
    expect(mockRouter.push).toHaveBeenCalledWith('/surprise');
    expect(screen.queryByTestId('checklist-household')).toBeNull();
  });

  it('ticks a step off once it has really happened, and leads with what the cook came for', async () => {
    usePreferences.setState({ intents: ['household'] });
    useCupboard.setState({ items: [{ ingredientId: 'egg', addedAt: 1, source: 'manual' }] });
    await render(<FirstRunChecklist />);
    expect(screen.getByText('1/5')).toBeTruthy();
    expect(screen.getByTestId('checklist-cupboard').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('Share your kitchen')).toBeTruthy();
  });

  it('goes for good when closed', async () => {
    await render(<FirstRunChecklist />);
    await fireEvent.press(screen.getByTestId('checklist-dismiss'));
    expect(screen.queryByTestId('checklist')).toBeNull();
    expect(useChecklist.getState().dismissed).toBe(true);
  });

  it('goes once every step is done', async () => {
    useCupboard.setState({ items: [{ ingredientId: 'egg', addedAt: 1, source: 'manual' }] });
    usePlan.setState({ entries: [{ id: 'e', recipeId: 'r', day: '2026-10-12', slot: 'dinner', servings: 2 }] });
    useSaved.setState({ bookmarks: [{ recipeId: 'r', savedAt: 1 }] });
    useCookLog.setState({ log: [{ id: 'c', recipeId: 'r', cookedAt: 1 }] });
    await render(<FirstRunChecklist />);
    expect(screen.queryByTestId('checklist')).toBeNull();
  });
});
