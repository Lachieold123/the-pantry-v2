// Toasts start with a capital, even though ingredient names are stored in
// lower case and extras are typed however the cook types them (audit F141).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { toISODate, weekStart } from '@/domain/plan/week';
import { usePlan } from '@/store/plan';
import { ShoppingListView } from './ShoppingListView';

const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.setTimeout(30_000);

const today = toISODate(new Date());
const week = weekStart(today);

beforeEach(() => {
  mockToast.mockClear();
  usePlan.setState({
    entries: [{ id: 'e1', recipeId: 'chicken-burrito-bowl', day: today, slot: 'dinner', servings: 4 }],
    listEdits: {},
  });
});

test('removing an ingredient names it with a capital', async () => {
  await render(<ShoppingListView week={week} weekLabel="This week" onBrowse={jest.fn()} />);
  const [remove] = screen.getAllByTestId(/^shopping-item-.+-remove$/);
  await fireEvent.press(remove!);
  expect(mockToast).toHaveBeenLastCalledWith(
    expect.objectContaining({ message: expect.stringMatching(/^[A-Z].* removed from the list$/) }),
  );
});

test('a typed extra is capitalised on the list and in its toasts', async () => {
  await render(<ShoppingListView week={week} weekLabel="This week" onBrowse={jest.fn()} />);
  await fireEvent.changeText(screen.getByTestId('shopping-add-extra'), 'dishwashing liquid');
  await fireEvent(screen.getByTestId('shopping-add-extra'), 'submitEditing');
  expect(screen.getByText('Dishwashing liquid')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('shopping-add-extra'), 'dishwashing liquid');
  await fireEvent(screen.getByTestId('shopping-add-extra'), 'submitEditing');
  expect(mockToast).toHaveBeenLastCalledWith({ message: 'Dishwashing liquid is already on the list' });
});
