// A dead link offers the way home by the tab's real name, Feed (audit F84), and
// goes back down to the existing tabs rather than stacking new ones (F206).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotFoundScreen } from './NotFoundScreen';

const mockRouter = { dismissTo: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

test('"Go to Feed" returns to the tabs underneath', async () => {
  await render(<NotFoundScreen />);
  await fireEvent.press(screen.getByText('Go to Feed'));
  expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
