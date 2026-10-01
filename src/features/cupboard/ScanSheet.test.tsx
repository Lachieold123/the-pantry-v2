import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useCupboard } from '@/store/cupboard';
import { useScans } from '@/store/scans';
import { ScanSheet } from './ScanSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));

// The service decides connected or not; each test sets what it returns.
const mockScan = { connected: false, reading: { status: 'not-connected' } as unknown };
jest.mock('@/lib/scan', () => ({
  get SCAN_CONNECTED() {
    return mockScan.connected;
  },
  readPhoto: async () => mockScan.reading,
}));
jest.mock('@/lib/photos', () => ({
  capturePhotos: async () => ({ status: 'ok', uris: ['file://receipt.jpg'] }),
  captureProblem: () => 'problem',
}));

beforeEach(() => {
  jest.clearAllMocks();
  useCupboard.setState({ items: [] });
  useScans.setState({ usedAt: [] });
});

describe('ScanSheet', () => {
  it('says plainly that scanning is not switched on yet, and offers the typed list', async () => {
    mockScan.connected = false;
    await render(<ScanSheet kind="receipt" />);
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.queryByTestId('scan-camera')).toBeNull();
    await fireEvent.press(screen.getByTestId('scan-use-list'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/cupboard/add-list');
  });

  it('reads a receipt, lets you check it, and adds what is ticked', async () => {
    mockScan.connected = true;
    mockScan.reading = {
      status: 'ok',
      result: { kind: 'receipt', storeName: 'Woolworths', items: [{ name: 'Eggs' }, { name: 'Feta' }, { name: 'Dish soap' }] },
    };
    await render(<ScanSheet kind="receipt" />);
    expect(screen.getByText('3 free scans left this month')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('scan-camera'));
    });
    expect(screen.getByText('From your receipt · Woolworths')).toBeTruthy();
    // Dish soap isn't food we know, so it's shown as skipped.
    expect(screen.getByText(/“Dish soap”: not one we know yet/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scan-item-feta'));
    await fireEvent.press(screen.getByTestId('scan-commit'));
    expect(useCupboard.getState().items.map((i) => [i.ingredientId, i.source])).toEqual([['egg', 'receipt']]);
    expect(useScans.getState().usedAt).toHaveLength(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ message: '1 added to your cupboard' }));
  });

  it('does not use up a scan when the reading fails', async () => {
    mockScan.connected = true;
    mockScan.reading = { status: 'failed', message: 'Couldn’t read that photo. Try again.' };
    await render(<ScanSheet kind="food" />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('scan-camera'));
    });
    expect(screen.getByText('Couldn’t read that photo. Try again.')).toBeTruthy();
    expect(useScans.getState().usedAt).toHaveLength(0);
  });

  it('stops at the monthly allowance', async () => {
    mockScan.connected = true;
    const now = Date.now();
    useScans.setState({ usedAt: [now, now, now] });
    await render(<ScanSheet kind="receipt" />);
    expect(screen.getByText(/You’ve used this month’s free scans/)).toBeTruthy();
    expect(screen.getByTestId('scan-camera')).toBeDisabled();
  });
});
