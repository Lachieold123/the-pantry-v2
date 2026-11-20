// Undo in the cupboard puts back or takes out only what the action changed (BUG-18).
import { useCupboard } from './cupboard';

beforeEach(() => useCupboard.setState({ items: [] }));

it('takes back only what an add put in, not something added since', () => {
  useCupboard.getState().add(['egg'], 'list');
  const added = [...useCupboard.getState().items];
  useCupboard.getState().add(['milk'], 'manual'); // a household member, a second later
  useCupboard.getState().takeBack(added);
  expect(useCupboard.getState().items.map((i) => i.ingredientId)).toEqual(['milk']);
});

it('restores a cleared cupboard on top of anything added since', () => {
  useCupboard.getState().add(['egg', 'feta'], 'manual');
  const was = useCupboard.getState().clear();
  useCupboard.getState().add(['milk'], 'manual');
  useCupboard.getState().restore(was);
  expect(
    useCupboard
      .getState()
      .items.map((i) => i.ingredientId)
      .sort(),
  ).toEqual(['egg', 'feta', 'milk']);
});
