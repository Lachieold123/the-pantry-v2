import { fireEvent, render, screen } from '@testing-library/react-native';

import { WaysIn } from './WaysIn';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

// The reader decides whether scanning shows; each test sets it.
const mockScan = { connected: false };
jest.mock('@/lib/scan', () => ({
  get SCAN_CONNECTED() {
    return mockScan.connected;
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('WaysIn', () => {
  it('offers only Add a list while scanning isn’t connected', async () => {
    mockScan.connected = false;
    await render(<WaysIn />);
    expect(screen.queryByTestId('cupboard-scan-receipt')).toBeNull();
    expect(screen.queryByTestId('cupboard-scan-food')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a list' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/cupboard/add-list');
  });

  it('adds both scans once the reader is connected', async () => {
    mockScan.connected = true;
    await render(<WaysIn />);
    await fireEvent.press(screen.getByTestId('cupboard-scan-receipt'));
    expect(mockRouter.push).toHaveBeenCalledWith('/cupboard/scan?kind=receipt');
    expect(screen.getByTestId('cupboard-scan-food')).toBeTruthy();
  });
});
