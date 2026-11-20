// What a store build hides and an internal build keeps (REL2-1, REL2-8,
// REPO-13). The flags themselves come from __DEV__ and
// EXPO_PUBLIC_SHOW_DRAFT_RECIPES; the screens read them from src/lib/build.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NotFoundScreen } from '@/features/app/NotFoundScreen';
import { WaysIn } from '@/features/cupboard/WaysIn';
import { FeedScreen } from '@/features/feed/FeedScreen';
import { ProSection } from '@/features/settings/ProSection';
import { DrawerScreen } from '@/features/shell/DrawerScreen';
import CooksRoute from './cooks/[id]';
import ScanRoute from './cupboard/scan';
import HomeViewerRoute from './dev/home-viewer';
import PublishedRoute from './feed/[id]';
import FeedRoute from './feed/index';

const mockKind = { internal: true };
jest.mock('@/lib/build', () => ({
  get INTERNAL_BUILD() {
    return mockKind.internal;
  },
  get COMMUNITY_SHOWN() {
    return mockKind.internal;
  },
  get SCAN_WAYS_SHOWN() {
    return mockKind.internal;
  },
}));

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  router: mockRouter,
  useLocalSearchParams: () => ({ id: 'x' }),
  Redirect: ({ href }: { href: string }) => {
    const { Text: T } = jest.requireActual<typeof import('react-native')>('react-native');
    return <T testID="redirect">{href}</T>;
  },
}));
// Reanimated can't load under Jest; the menu's slide is not what's tested here.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: PlainView } = require('react-native');
  return {
    __esModule: true,
    default: { View: PlainView },
    useSharedValue: (v: number) => ({ value: v, set: () => undefined }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// The community screens read the live server; here only whether the route shows them matters.
function mockStub(testID: string) {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return <Text testID={testID} />;
}
jest.mock('@/features/feed/CommunityFeedScreen', () => ({ CommunityFeedScreen: () => mockStub('community-feed') }));
jest.mock('@/features/feed/CookScreen', () => ({ CookScreen: () => mockStub('cook-page') }));
jest.mock('@/features/recipe/PublishedRecipeScreen', () => ({ PublishedRecipeScreen: () => mockStub('published-recipe') }));
jest.mock('@/features/cupboard/ScanSheet', () => ({ ScanSheet: () => mockStub('scan-sheet') }));
jest.mock('@/features/dev/HomeViewerScreen', () => ({ HomeViewerScreen: () => mockStub('home-viewer') }));
jest.mock('@/features/feed/HomeForYou', () => ({ HomeForYou: () => mockStub('home-for-you') }));

beforeEach(() => jest.clearAllMocks());

describe('a store build', () => {
  beforeEach(() => {
    mockKind.internal = false;
  });

  it.each([
    ['the feed', FeedRoute],
    ['a cook page', CooksRoute],
    ['a published recipe', PublishedRoute],
    ['the scan sheet', ScanRoute],
  ])('answers not-found for %s', async (_, Route) => {
    await render(<Route />);
    expect(screen.getByTestId('not-found')).toBeTruthy();
  });

  it('has no "From other cooks" section on Home', async () => {
    await render(<FeedScreen />);
    expect(screen.getByTestId('home-browse-all')).toBeTruthy();
    expect(screen.queryByTestId('home-for-you')).toBeNull();
  });

  it('has no menu row for other cooks', async () => {
    await render(<DrawerScreen />);
    expect(screen.getByTestId('menu-browse')).toBeTruthy();
    expect(screen.queryByTestId('menu-community')).toBeNull();
  });

  it('shows only "Add a list" in the Cupboard, no "Coming soon" scan tiles', async () => {
    await render(<WaysIn />);
    expect(screen.getByTestId('cupboard-add-list')).toBeTruthy();
    expect(screen.queryByTestId('cupboard-scan-receipt')).toBeNull();
    expect(screen.queryByTestId('cupboard-scan-food')).toBeNull();
  });

  it('never shows the Home viewer or the Pro testing switches', async () => {
    await render(<HomeViewerRoute />);
    expect(screen.queryByTestId('home-viewer')).toBeNull();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
    await render(<ProSection />);
    expect(screen.queryByTestId('settings-preview-limits')).toBeNull();
    expect(screen.queryByTestId('settings-pretend-pro')).toBeNull();
  });
});

describe('an internal build', () => {
  beforeEach(() => {
    mockKind.internal = true;
  });

  it.each([
    ['community-feed', FeedRoute],
    ['cook-page', CooksRoute],
    ['published-recipe', PublishedRoute],
    ['scan-sheet', ScanRoute],
  ])('opens %s', async (id, Route) => {
    await render(<Route />);
    expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('shows "From other cooks" on Home', async () => {
    await render(<FeedScreen />);
    expect(screen.getByTestId('home-for-you')).toBeTruthy();
  });

  it('reaches the feed from the menu', async () => {
    await render(<DrawerScreen />);
    await fireEvent.press(screen.getByTestId('menu-community'));
    // The menu slides out first, then opens the page.
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/feed'));
  });

  it('shows all three ways in, and the testing aids', async () => {
    await render(<WaysIn />);
    expect(screen.getByTestId('cupboard-scan-receipt')).toBeTruthy();
    expect(screen.getByTestId('cupboard-scan-food')).toBeTruthy();
    await render(<HomeViewerRoute />);
    expect(screen.getByTestId('home-viewer')).toBeTruthy();
    await render(<ProSection />);
    expect(screen.getByTestId('settings-pretend-pro')).toBeTruthy();
  });
});

// Keeps the import honest: the not-found the routes answer with is the app's own.
it('uses the app’s normal not-found screen', async () => {
  await render(<NotFoundScreen />);
  expect(screen.getByText('This page doesn’t exist')).toBeTruthy();
});
