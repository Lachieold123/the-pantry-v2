// Navigation out of pushed pages, proved on a real expo-router stack shaped
// like the app's: a root Stack with the tab navigator anchored at its bottom.
// F48: a page opened cold from a link has a way back. F206: "Browse recipes"
// from a pushed page never stacks a second tab bar. F57: the retaken taste
// quiz finishes on the existing tabs.
import { act } from '@testing-library/react-native';
import { Stack, Tabs, router } from 'expo-router';
import { store } from 'expo-router/build/global-state/store';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

// The real root layout's settings, so the test fails if the anchor is removed.
import { unstable_settings } from '@/app/_layout';
import { goBackOr, goToTab } from './navigation';

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: async () => undefined, hideAsync: async () => undefined }));
// Importing the root layout runs its start-up calls; these stand in for the native parts.
jest.mock('@/lib/notifications', () => ({ configureNotifications: () => undefined }));
jest.mock('@/lib/notificationTaps', () => ({ useNotificationTaps: () => undefined }));

type Nav = { name: string; state?: StackState };
type StackState = { index: number; routes: Nav[] };
// The app's root Stack, inside expo-router's own __root wrapper.
const rootStack = (): StackState => {
  const state = store.navigationRef.getRootState() as unknown as StackState;
  const wrapper = state.routes[0];
  return wrapper?.name === '__root' && wrapper.state ? wrapper.state : state;
};
const names = () => rootStack().routes.map((r) => r.name);
const tabsCopies = () => names().filter((n) => n === '(tabs)').length;
const shown = () => {
  const root = rootStack();
  const top = root.routes[root.index]!;
  return top.state ? `${top.name}/${top.state.routes[top.state.index]!.name}` : top.name;
};

const routes = () => ({
  _layout: { default: () => <Stack />, unstable_settings },
  '(tabs)/_layout': () => <Tabs />,
  '(tabs)/index': () => <Text>feed</Text>,
  '(tabs)/browse': () => <Text>browse</Text>,
  'saved/index': () => <Text>saved</Text>,
  'settings/index': () => <Text>settings</Text>,
  welcome: () => <Text>welcome</Text>,
  'recipe/[id]/index': () => <Text>recipe</Text>,
  'recipe/[id]/cook': () => <Text>cook</Text>,
});

async function open(initialUrl: string) {
  await renderRouter(routes(), { initialUrl });
  await act(async () => {});
}
async function go(fn: () => void) {
  await act(async () => fn());
  await act(async () => {});
}

jest.setTimeout(30_000);

test('a cold link to a recipe has the tabs underneath, so Back works (F48)', async () => {
  await open('/recipe/abc');
  expect(names()).toEqual(['(tabs)', 'recipe/[id]/index']);
  await go(() => goBackOr(router));
  expect(shown()).toBe('(tabs)/index');
});

test('a cold link straight into Cook: Done and × still leave (F48)', async () => {
  await open('/recipe/abc/cook');
  expect(router.canGoBack()).toBe(true);
  await go(() => goBackOr(router));
  expect(names()).toEqual(['(tabs)']);
});

test('"Browse recipes" from a pushed page goes to the one tab bar, however often (F206)', async () => {
  await open('/');
  for (let i = 0; i < 3; i++) {
    await go(() => router.push('/saved'));
    await go(() => goToTab(router, '/browse'));
    expect(tabsCopies()).toBe(1);
    expect(shown()).toBe('(tabs)/browse');
  }
  expect(names()).toEqual(['(tabs)']);
});

test('"Browse recipes" from a page opened cold also lands on the tabs (F206)', async () => {
  await open('/saved');
  await go(() => goToTab(router, '/browse'));
  expect(names()).toEqual(['(tabs)']);
  expect(shown()).toBe('(tabs)/browse');
});

test('finishing a retaken taste quiz returns to the existing tabs (F57)', async () => {
  await open('/');
  await go(() => router.push('/settings'));
  await go(() => router.push('/welcome'));
  await go(() => goToTab(router, '/'));
  expect(names()).toEqual(['(tabs)']);
  expect(shown()).toBe('(tabs)/index');
});

test('finishing the first-run quiz, with nothing underneath, still reaches the tabs (F57)', async () => {
  await open('/');
  await go(() => router.replace('/welcome'));
  expect(names()).toEqual(['welcome']);
  await go(() => goToTab(router, '/'));
  expect(names()).toEqual(['(tabs)']);
});
