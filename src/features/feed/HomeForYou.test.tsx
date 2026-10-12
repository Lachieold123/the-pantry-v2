// Home's ranked section from other cooks: followed cooks first with the reason
// on the card, "Can cook now" and "Missing 1-2" from the cupboard, "Not for
// me" hides a recipe, and every shown card is logged as an impression. The
// server is mocked with rows shaped as it sends them.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DEFAULT_SHELF } from '@/domain/cupboard/cookable';
import { parseRankRow } from '@/domain/home-engine/fromPublished';
import { feedRow } from '@/domain/testing/published';
import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import type { RankRow } from '@/domain/home-engine/fromPublished';
import type { ReadResult } from '@/lib/published';
import { useCupboard } from '@/store/cupboard';
import { useHomeEvents } from '@/store/homeEvents';
import { HomeForYou } from './HomeForYou';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockRows = jest.fn<Promise<ReadResult<RankRow[]>>, []>();
const mockFollows = jest.fn<Promise<ReadResult<string[]>>, [string]>();
jest.mock('@/lib/homeFeedReads', () => ({
  fetchRankRows: () => mockRows(),
  fetchFollows: (id: string) => mockFollows(id),
  fetchCookList: () => Promise.resolve({ ok: true, value: [] }),
}));

const FOLLOWED = '33333333-3333-4333-8333-333333333333';
const line = (raw: string, item: string, ingredientId: string) => ({ raw, item, ingredientId, quantity: 1 });
function row(n: number, cookId: string, lines: ReturnType<typeof line>[]): RankRow {
  const raw = feedRow(n, {
    meal_types: ['dinner'],
    diets: [],
    difficulty: 'easy',
    groups: [{ items: lines }],
    cook: { id: cookId, handle: `cook${n}`, display_name: `Cook ${n}`, avatar_path: null, follower_count: 10, recipe_count: 5 },
  });
  return parseRankRow(raw, INGREDIENTS, KITCHEN)!;
}
const EGGS = row(1, '44444444-4444-4444-8444-444444444444', [line('4 eggs', 'eggs', 'egg'), line('1 lemon', 'lemon', 'lemon')]);
const NEARLY = row(2, '55555555-5555-4555-8555-555555555555', [line('4 eggs', 'eggs', 'egg'), line('1 leek', 'leek', 'leek')]);
const FOLLOW = row(3, FOLLOWED, [
  line('1 kg pork belly', 'pork belly', 'pork-belly'),
  line('2 limes', 'limes', 'lime'),
  line('1 leek', 'leek', 'leek'),
  line('1 daikon', 'daikon', 'daikon'),
]);

beforeEach(() => {
  jest.clearAllMocks();
  useCupboard.setState({ items: [], shelf: DEFAULT_SHELF });
  useHomeEvents.setState({ events: [], asCookId: undefined });
  mockRows.mockResolvedValue({ ok: true, value: [EGGS, NEARLY, FOLLOW] });
  mockFollows.mockResolvedValue({ ok: true, value: [] });
});

describe('Home, picked for you', () => {
  it('ranks as an AI cook with their follows first, and says why', async () => {
    useHomeEvents.setState({ asCookId: '66666666-6666-4666-8666-666666666666' });
    mockFollows.mockResolvedValue({ ok: true, value: [FOLLOWED] });
    await render(<HomeForYou />);
    expect(await screen.findByText('Because you follow Cook 3')).toBeTruthy();
    expect(mockFollows).toHaveBeenCalledWith('66666666-6666-4666-8666-666666666666');
    expect(screen.getByTestId('home-viewing-as').props.children).toMatch(/AI cook/);
  });

  it('shows Can cook now and Missing 1-2 from the cupboard, with what is missing', async () => {
    useCupboard.setState({ items: ['egg', 'lemon'].map((ingredientId) => ({ ingredientId, addedAt: 1, source: 'manual' as const })) });
    await render(<HomeForYou />);
    expect(await screen.findByTestId(`home-can-cook-${EGGS.item.id}`)).toBeTruthy();
    expect(screen.getByTestId(`home-missing-few-${NEARLY.item.id}`)).toBeTruthy();
    expect(screen.getByText('Need leek')).toBeTruthy();
    expect(screen.getByText(/You can cook this now: 2\/2 ingredients/)).toBeTruthy();
  });

  it('logs impressions, opens on tap, and hides on "Not for me"', async () => {
    await render(<HomeForYou />);
    const id = EGGS.item.id;
    await screen.findByTestId(`home-reason-${id}`);
    expect(useHomeEvents.getState().events.filter((e) => e.type === 'impression')).toHaveLength(3);
    await fireEvent.press(screen.getByTestId(`published-open-${id}`));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/feed/[id]', params: { id } });
    expect(useHomeEvents.getState().events.some((e) => e.type === 'open' && e.itemId === id)).toBe(true);
    await act(async () => fireEvent.press(screen.getByTestId(`home-hide-${id}`)));
    expect(screen.queryByTestId(`home-reason-${id}`)).toBeNull();
  });

  it('says so when the server can’t be reached, and retries', async () => {
    mockRows.mockResolvedValueOnce({ ok: false, problem: 'offline' });
    await render(<HomeForYou />);
    expect(await screen.findByTestId('home-for-you-error')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-for-you-retry'));
    expect(await screen.findByTestId(`home-reason-${EGGS.item.id}`)).toBeTruthy();
  });
});
