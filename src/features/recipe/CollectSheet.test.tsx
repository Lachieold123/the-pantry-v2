// The free limits as people meet them (D-038): off until buying works, then a
// fourth collection or a day next week opens the paywall instead.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FREE } from '@/domain/pro/pro';
import { usePro } from '@/store/pro';
import { useSaved } from '@/store/saved';
import { CollectSheet } from './CollectSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const three = ['Weeknights', 'Guests', 'Summer'].map((name, i) => ({ id: `c${i}`, name, recipeIds: [], createdAt: 1, updatedAt: 1 }));

beforeEach(() => {
  jest.clearAllMocks();
  useSaved.setState({ collections: three });
  usePro.setState({ entitlement: FREE, pretendPro: false, previewLimits: false, importsAt: [] });
});

async function makeFourth() {
  await render(<CollectSheet id="carbonara" />);
  await fireEvent.changeText(screen.getByTestId('collect-new-name'), 'Fridays');
  await fireEvent.press(screen.getByTestId('collect-create'));
}

describe('free limits', () => {
  it('don’t apply while Pro isn’t on sale', async () => {
    await makeFourth();
    expect(useSaved.getState().collections).toHaveLength(4);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
  it('once they apply, a fourth collection opens Pro and isn’t made', async () => {
    usePro.setState({ previewLimits: true });
    await makeFourth();
    expect(useSaved.getState().collections).toHaveLength(3);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pro', params: { from: 'collections' } });
  });
  it('never apply to someone who’s Pro', async () => {
    usePro.setState({ previewLimits: true, pretendPro: true });
    await makeFourth();
    expect(useSaved.getState().collections).toHaveLength(4);
  });
});
