// Other cooks' recipes: the full feed pages in as you scroll, Home shows the
// newest few, and a cook's profile shows their counts and recipes. The server
// is mocked with rows shaped as it sends them.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { parseCook, parseFeedPage, type FeedCursor } from '@/domain/published/published';
import { COOK_ROW, feedRow } from '@/domain/testing/published';
import type { FeedPage, ReadResult } from '@/lib/published';
import { CommunityFeedScreen } from './CommunityFeedScreen';
import { CommunityRail } from './CommunityRail';
import { CookScreen } from './CookScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockFeed = jest.fn<Promise<ReadResult<FeedPage>>, [FeedCursor | undefined, string | undefined]>();
const mockCook = jest.fn();
jest.mock('@/lib/published', () => ({
  ...jest.requireActual('@/lib/published'),
  fetchFeedPage: (cursor?: FeedCursor, cookId?: string) => mockFeed(cursor, cookId),
  fetchCook: (id: string) => mockCook(id),
}));

const page = (from: number, to: number, next?: FeedCursor): ReadResult<FeedPage> => ({
  ok: true,
  value: { items: parseFeedPage(Array.from({ length: to - from + 1 }, (_, i) => feedRow(from + i))), next },
});
const CURSOR = { publishedAt: '2026-10-01T00:00:00Z', id: '00000002-0000-4000-8000-000000000000' };

beforeEach(() => jest.clearAllMocks());

describe('the full feed', () => {
  it('shows each recipe with its photo credit, cook and caption, newest first', async () => {
    mockFeed.mockResolvedValueOnce(page(1, 2));
    await render(<CommunityFeedScreen />);
    expect(await screen.findByText('Dish 1')).toBeTruthy();
    expect(screen.getByText('Caption for dish 1')).toBeTruthy();
    expect(screen.getAllByText('Kai Santos')).toHaveLength(2);
    expect(screen.getAllByText('@kinilaw.kai')).toHaveLength(2);
    expect(screen.getByTestId(`published-credit-${feedRow(1).id}`).props.children).toBe('Photo: Someone / Pexels');
    expect(screen.getByTestId('feed-end')).toBeTruthy();
    expect(mockFeed).toHaveBeenCalledWith(undefined, undefined);
  });

  it('opens the recipe from the card, and the cook from their row', async () => {
    mockFeed.mockResolvedValueOnce(page(1, 1));
    await render(<CommunityFeedScreen />);
    const id = feedRow(1).id;
    await fireEvent.press(await screen.findByTestId(`published-open-${id}`));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/feed/[id]', params: { id } });
    await fireEvent.press(screen.getByTestId(`published-cook-${id}`));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/cooks/[id]', params: { id: COOK_ROW.id } });
  });

  it('loads the next page near the end, once, then stops at the last', async () => {
    let arrive: (r: ReadResult<FeedPage>) => void = () => {};
    mockFeed.mockResolvedValueOnce(page(1, 2, CURSOR)).mockReturnValueOnce(new Promise((resolve) => (arrive = resolve)));
    await render(<CommunityFeedScreen />);
    await screen.findByText('Dish 2');
    expect(screen.queryByTestId('feed-end')).toBeNull();
    // A second "near the end" while the page is on its way doesn't ask again.
    await fireEvent(screen.getByTestId('community-feed'), 'endReached');
    await fireEvent(screen.getByTestId('community-feed'), 'endReached');
    expect(screen.getByTestId('feed-loading')).toBeTruthy();
    await act(async () => arrive(page(3, 4)));
    expect(await screen.findByText('Dish 4')).toBeTruthy();
    expect(mockFeed).toHaveBeenCalledTimes(2);
    expect(mockFeed).toHaveBeenLastCalledWith(CURSOR, undefined);
    expect(screen.getByTestId('feed-end')).toBeTruthy();
  });

  it('says plainly when the server can’t be reached, and tries again', async () => {
    mockFeed.mockResolvedValueOnce({ ok: false, problem: 'offline' }).mockResolvedValueOnce(page(1, 1));
    await render(<CommunityFeedScreen />);
    expect(await screen.findByText('Couldn’t reach the server. Check your connection and try again.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feed-retry'));
    expect(await screen.findByText('Dish 1')).toBeTruthy();
  });

  it('a failed later page keeps what’s shown and offers a retry', async () => {
    mockFeed
      .mockResolvedValueOnce(page(1, 1, CURSOR))
      .mockResolvedValueOnce({ ok: false, problem: 'failed' })
      .mockResolvedValueOnce(page(2, 2));
    await render(<CommunityFeedScreen />);
    await screen.findByText('Dish 1');
    await fireEvent(screen.getByTestId('community-feed'), 'endReached');
    expect(await screen.findByTestId('feed-error')).toBeTruthy();
    expect(screen.getByText('Dish 1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feed-retry'));
    expect(await screen.findByText('Dish 2')).toBeTruthy();
  });

  it('has an empty state', async () => {
    mockFeed.mockResolvedValueOnce(page(1, 0));
    await render(<CommunityFeedScreen />);
    expect(await screen.findByTestId('feed-empty')).toBeTruthy();
  });
});

describe('Home’s section', () => {
  it('shows the newest three and leads to the rest', async () => {
    mockFeed.mockResolvedValueOnce(page(1, 5, CURSOR));
    await render(<CommunityRail />);
    expect(await screen.findByText('Dish 3')).toBeTruthy();
    expect(screen.queryByText('Dish 4')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-community-more'));
    expect(mockRouter.push).toHaveBeenCalledWith('/feed');
  });

  it('hides itself when nothing is published', async () => {
    mockFeed.mockResolvedValueOnce(page(1, 0));
    await render(<CommunityRail />);
    await act(async () => {});
    expect(screen.queryByTestId('home-community')).toBeNull();
  });

  it('offers a retry when it couldn’t load', async () => {
    mockFeed.mockResolvedValueOnce({ ok: false, problem: 'offline' }).mockResolvedValueOnce(page(1, 1));
    await render(<CommunityRail />);
    await fireEvent.press(await screen.findByTestId('home-community-retry'));
    expect(await screen.findByText('Dish 1')).toBeTruthy();
  });
});

describe('a cook’s profile', () => {
  it('shows who they are, the database’s counts and only their recipes', async () => {
    mockCook.mockResolvedValueOnce({ ok: true, value: parseCook(COOK_ROW) });
    mockFeed.mockResolvedValueOnce(page(1, 1));
    await render(<CookScreen id={COOK_ROW.id} />);
    expect(await screen.findByText('Dish 1')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Kai Santos' })).toBeTruthy();
    expect(screen.getByText('Filipino home cooking by the reef.')).toBeTruthy();
    expect(screen.getByTestId('cook-counts').props.children).toBe('1 recipe · 1,200 followers · 26 following');
    expect(mockFeed).toHaveBeenCalledWith(undefined, COOK_ROW.id);
    // Their own row would only lead back here.
    expect(screen.queryByTestId(`published-cook-${feedRow(1).id}`)).toBeNull();
  });

  it('says when the cook isn’t there', async () => {
    mockCook.mockResolvedValueOnce({ ok: false, problem: 'not-found' });
    mockFeed.mockResolvedValueOnce(page(1, 0));
    await render(<CookScreen id="nope" />);
    expect(await screen.findByText('We couldn’t find that cook')).toBeTruthy();
    expect(screen.queryByTestId('cook-retry')).toBeNull();
  });
});
