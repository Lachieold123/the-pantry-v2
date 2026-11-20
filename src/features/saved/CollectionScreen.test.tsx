// A missing collection says one thing (UX-11), and a collection whose
// recipes have all gone counts what it really holds (F-10).
import { render, screen } from '@testing-library/react-native';

import { useSaved } from '@/store/saved';
import { CollectionScreen } from './CollectionScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

it('a collection that is gone shows only its empty state, with a way back', async () => {
  useSaved.setState({ collections: [] });
  await render(<CollectionScreen id="gone" />);
  expect(screen.getByText('This collection is gone')).toBeTruthy();
  expect(screen.queryByText('Not found')).toBeNull();
  expect(screen.queryByText(/0 recipes/)).toBeNull();
});

it('a collection holding only removed recipes says it is empty and counts none', async () => {
  useSaved.setState({ collections: [{ id: 'c', name: 'Gone ones', recipeIds: ['no-such-recipe'], createdAt: 1 }] as never });
  await render(<CollectionScreen id="c" />);
  expect(screen.getByText('This collection is empty')).toBeTruthy();
});
