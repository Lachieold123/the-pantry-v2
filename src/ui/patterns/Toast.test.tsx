import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { SPACE } from '@/ui/tokens/type';
import { ToastProvider, useToast, useToastFloor } from './Toast';

// Reanimated (and its worklets runtime) can't load under Jest, its own mock included.
// A plain View is enough here: these tests are about where the toast sits, not how it moves.
jest.mock('react-native-reanimated', () => {
  // jest.mock factories run before imports, so require is the only way in.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: PlainView } = require('react-native');
  const motion = { duration: () => motion };
  return { __esModule: true, default: { View: PlainView }, FadeInDown: motion, FadeOutDown: motion, LinearTransition: motion };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));

const TAB_BAR = 86;

function Page({ floor }: { floor: boolean }) {
  const toast = useToast();
  // Stands in for the tab bar: fixed chrome that claims the foot while its screen is in front.
  useToastFloor(TAB_BAR, floor);
  return <Button label="Do it" onPress={() => toast({ message: 'Done' })} testID="do" />;
}

/** How far up from the bottom of the screen the toast sits. */
function toastBottom(): number {
  let node = screen.getByTestId('toast').parent;
  // The positioned wrapper is the nearest ancestor with a `bottom`.
  while (node && StyleSheet.flatten(node.props.style)?.bottom === undefined) node = node.parent;
  return StyleSheet.flatten(node?.props.style).bottom as number;
}

async function show(floor: boolean) {
  await render(
    <ToastProvider>
      <View>
        <Page floor={floor} />
      </View>
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByTestId('do'));
  await act(async () => {});
}

describe('Toast placement', () => {
  it('sits just above the tab bar on a tab screen', async () => {
    await show(true);
    expect(toastBottom()).toBe(TAB_BAR + SPACE.sm);
  });

  it('sits just above the bottom safe area where nothing is fixed to the foot', async () => {
    await show(false);
    expect(toastBottom()).toBe(34 + SPACE.sm);
  });
});
