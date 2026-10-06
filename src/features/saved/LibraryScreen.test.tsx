// The library is one page with four tabs: a link picks the tab, the head's
// count follows it, and switching is local, so it never navigates.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSaved } from '@/store/saved';
import { LibraryScreen } from './LibraryScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const collection = { id: 'c0', name: 'Weeknights', recipeIds: [], createdAt: 1, updatedAt: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  useSaved.setState({ bookmarks: [], collections: [collection], recentlyViewed: [] });
});

describe('the library', () => {
  it('opens on Cookmarks by default, and for a tab it doesn’t know', async () => {
    await render(<LibraryScreen initialTab="nonsense" />);
    expect(screen.getByTestId('cookmarks-empty')).toBeTruthy();
    expect(screen.getByLabelText('0 saved recipes')).toBeTruthy();
  });

  it('opens on the tab a link asks for', async () => {
    await render(<LibraryScreen initialTab="recent" />);
    expect(screen.getByTestId('recent-empty')).toBeTruthy();
    expect(screen.getByTestId('library-tab-recent').props.accessibilityState).toEqual({ selected: true });
  });

  it('switches tabs in place, with the count following', async () => {
    await render(<LibraryScreen />);
    await fireEvent.press(screen.getByTestId('library-tab-collections'));
    expect(screen.getByTestId('collections-new')).toBeTruthy();
    expect(screen.getByLabelText('1 collection')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('library-tab-mine'));
    expect(screen.getByTestId('mine-empty')).toBeTruthy();
    expect(screen.queryByTestId('collections-screen')).toBeNull();
    // Only the empty states' own actions navigate; the tabs never do.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
