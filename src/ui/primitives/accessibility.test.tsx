// The screen-reader fixes from the 2026-10-07 accessibility audit: problems are
// spoken as they appear (iOS ignores live regions), error titles are headings,
// your own photos are named, and Undo is mentioned when there is one.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { ErrorState } from '@/ui/patterns/ErrorState';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { ToastProvider, useToast } from '@/ui/patterns/Toast';
import { Button } from './Button';
import { TextField } from './TextField';

// Reanimated can't load under Jest (see Toast.test.tsx); the toast only needs a plain View.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: PlainView } = require('react-native');
  const motion = { duration: () => motion };
  return { __esModule: true, default: { View: PlainView }, FadeInDown: motion, FadeOutDown: motion, LinearTransition: motion };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));

let spoken: jest.SpyInstance;
beforeEach(() => {
  spoken = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
});
afterEach(() => spoken.mockRestore());

describe('screen-reader announcements', () => {
  it('a field says its problem out loud when it appears, and only then', async () => {
    const { rerender } = await render(<TextField label="Name" value="" onChangeText={() => undefined} />);
    expect(spoken).not.toHaveBeenCalled();
    await rerender(<TextField label="Name" value="" onChangeText={() => undefined} error="Give it a name" />);
    expect(spoken).toHaveBeenCalledWith('Give it a name');
  });

  it('an error block announces itself and its title is a heading', async () => {
    await render(<ErrorState body="Check your connection." onRetry={() => undefined} />);
    expect(spoken).toHaveBeenCalledWith('That didn’t work. Check your connection.');
    expect(screen.getByRole('header', { name: 'That didn’t work' })).toBeTruthy();
  });

  it('a toast with Undo says that Undo is there', async () => {
    function Page() {
      const toast = useToast();
      return <Button label="Remove" onPress={() => toast({ message: 'Eggs removed', undo: () => undefined })} testID="go" />;
    }
    await render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    await act(async () => {});
    expect(spoken).toHaveBeenCalledWith('Eggs removed. Undo available.');
  });
});

describe('photos', () => {
  it('your own photo is named for VoiceOver', async () => {
    await render(
      <RecipeImage source={{ uri: 'file:///plate.jpg' }} shape="square" cuisine="italian" label="Your photo of Lasagne, 1 of 2" />,
    );
    expect(screen.getByRole('image', { name: 'Your photo of Lasagne, 1 of 2' })).toBeTruthy();
  });

  it('a recipe photo without a label stays decoration', async () => {
    await render(
      <RecipeImage source={{ uri: 'file:///hero.jpg' }} shape="square" cuisine="italian">
        <Text>Overlay</Text>
      </RecipeImage>,
    );
    expect(screen.queryByRole('image')).toBeNull();
  });
});
