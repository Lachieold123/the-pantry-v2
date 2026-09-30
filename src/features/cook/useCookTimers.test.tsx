// The timer races from the audit (F45–F47, F185, F188): an alert must never
// outlive its timer, a repeat tap mustn't start a twin, and a phone that won't
// deliver alerts says so once.
import { act, renderHook } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { useCookTimers } from './useCookTimers';

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let mockPermission: Deferred<boolean>;
let mockScheduling: Deferred<string> | undefined;
const mockScheduled: { id: string; title: string; body: string; timeSensitive: boolean | undefined }[] = [];
const mockCancelled: string[] = [];
const mockToast = jest.fn();

jest.mock('@/lib/notifications', () => ({
  ensureNotificationPermission: () => mockPermission.promise,
  scheduleAt: async (_when: number, title: string, body: string, options?: { timeSensitive?: boolean }) => {
    const id = `n${mockScheduled.length + 1}`;
    mockScheduled.push({ id, title, body, timeSensitive: options?.timeSensitive });
    if (mockScheduling) await mockScheduling.promise;
    return id;
  },
  cancelScheduled: async (id?: string) => {
    if (id) mockCancelled.push(id);
  },
}));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 's' } }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));

const orphans = () => mockScheduled.map((s) => s.id).filter((id) => !mockCancelled.includes(id));

beforeEach(() => {
  mockPermission = deferred<boolean>();
  mockScheduling = undefined;
  mockScheduled.length = 0;
  mockCancelled.length = 0;
  mockToast.mockClear();
});

test('cancelling while the permission prompt is up schedules nothing', async () => {
  const { result } = await renderHook(() => useCookTimers());
  let p!: Promise<void>;
  await act(async () => {
    p = result.current.start('10 minutes', 0, 600, 'Simmer.');
  });
  await act(async () => result.current.dismiss(result.current.timers[0]!.id));
  await act(async () => {
    mockPermission.resolve(true);
    await p;
  });
  expect(result.current.timers).toHaveLength(0);
  expect(orphans()).toEqual([]);
});

test('cancelling while the alert is being scheduled cancels the late id', async () => {
  mockScheduling = deferred<string>();
  const { result } = await renderHook(() => useCookTimers());
  let p!: Promise<void>;
  await act(async () => {
    p = result.current.start('10 minutes', 0, 600, 'Simmer.');
    mockPermission.resolve(true);
  });
  expect(mockScheduled).toHaveLength(1);
  await act(async () => result.current.dismiss(result.current.timers[0]!.id));
  await act(async () => {
    mockScheduling!.resolve('');
    await p;
  });
  expect(orphans()).toEqual([]);
});

test('leaving Cook Mode mid-schedule leaves no alert behind', async () => {
  mockScheduling = deferred<string>();
  const { result, unmount } = await renderHook(() => useCookTimers());
  let p!: Promise<void>;
  await act(async () => {
    p = result.current.start('10 minutes', 0, 600, 'Simmer.');
    mockPermission.resolve(true);
  });
  await unmount();
  await act(async () => {
    mockScheduling!.resolve('');
    await p;
  });
  expect(mockScheduled).toHaveLength(1);
  expect(orphans()).toEqual([]);
});

test('leaving Cook Mode during the permission prompt leaves no alert behind', async () => {
  const { result, unmount } = await renderHook(() => useCookTimers());
  let p!: Promise<void>;
  await act(async () => {
    p = result.current.start('10 minutes', 0, 600, 'Simmer.');
  });
  await unmount();
  await act(async () => {
    mockPermission.resolve(true);
    await p;
  });
  expect(orphans()).toEqual([]);
});

test('a running timer survives and its alert says which step, time-sensitive', async () => {
  const { result } = await renderHook(() => useCookTimers());
  await act(async () => {
    const p = result.current.start('8–10 minutes', 3, 600, 'Simmer the lentils until soft.');
    mockPermission.resolve(true);
    await p;
  });
  expect(result.current.timers).toHaveLength(1);
  expect(mockScheduled).toEqual([{ id: 'n1', title: 'Step 4 timer done', body: 'Simmer the lentils until soft.', timeSensitive: true }]);
  expect(orphans()).toEqual(['n1']);
});

test('tapping the same time twice starts one timer, not two', async () => {
  const { result } = await renderHook(() => useCookTimers());
  mockPermission.resolve(true);
  await act(async () => {
    await result.current.start('10 minutes', 0, 600);
  });
  await act(async () => {
    await result.current.start('10 minutes', 0, 600);
  });
  expect(result.current.timers).toHaveLength(1);
  expect(mockToast).toHaveBeenCalledWith({ message: 'The 10 minutes timer is already running' });
  // The same time in a different step is a different timer.
  await act(async () => {
    await result.current.start('10 minutes', 1, 600);
  });
  expect(result.current.timers).toHaveLength(2);
});

test('with notifications off, says so once and offers Settings', async () => {
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  const { result } = await renderHook(() => useCookTimers());
  mockPermission.resolve(false);
  await act(async () => {
    await result.current.start('5 minutes', 0, 300);
  });
  await act(async () => {
    await result.current.start('2 minutes', 1, 120);
  });
  expect(mockScheduled).toHaveLength(0);
  expect(mockToast).toHaveBeenCalledTimes(1);
  const shown = mockToast.mock.calls[0]![0] as { actionLabel: string; undo: () => void };
  expect(shown.actionLabel).toBe('Open Settings');
  shown.undo();
  expect(open).toHaveBeenCalled();
});
