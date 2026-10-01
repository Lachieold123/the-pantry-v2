import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { EMPTY_PLATE } from '@/domain/plates/plate';
import { usePlates } from '@/store/plates';
import { PostScreen } from './PostScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('@/lib/photos', () => ({
  capturePhotos: async () => ({ status: 'ok', uris: ['file://pho.jpg'] }),
  captureProblem: () => 'problem',
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  jest.clearAllMocks();
  usePlates.setState({ plates: [], draft: EMPTY_PLATE });
});

describe('PostScreen', () => {
  it('won’t share without a photo and a name, and says what’s missing', async () => {
    await render(<PostScreen />);
    await fireEvent.press(screen.getByTestId('post-share'));
    expect(screen.getByText('Almost there: add a photo and name the dish.')).toBeTruthy();
    expect(usePlates.getState().plates).toHaveLength(0);
  });

  it('takes a photo, links a recipe, and shares it to your plates', async () => {
    await render(<PostScreen />);
    await fireEvent.press(screen.getByTestId('post-add-photo'));
    await fireEvent.press(screen.getByTestId('post-camera'));
    // The sheet acts once it has closed (ActionSheet waits MOTION.slow).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(usePlates.getState().draft.photoUris).toEqual(['file://pho.jpg']);
    await fireEvent.changeText(screen.getByTestId('post-title'), 'carbonara');
    await fireEvent.press(screen.getByTestId('post-link-carbonara'));
    expect(screen.getByTestId('post-unlink')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('post-share'));
    const [plate] = usePlates.getState().plates;
    expect(plate).toMatchObject({ title: 'carbonara', recipeId: 'carbonara', photoUris: ['file://pho.jpg'] });
    expect(usePlates.getState().draft).toEqual(EMPTY_PLATE);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('keeps what you typed as a draft when you close', async () => {
    await render(<PostScreen />);
    await fireEvent.changeText(screen.getByTestId('post-title'), 'Nan’s soup');
    await fireEvent.press(screen.getByTestId('post-close'));
    expect(usePlates.getState().draft.title).toBe('Nan’s soup');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('draft') }));
  });
});
