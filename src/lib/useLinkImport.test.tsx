// An enormous imported recipe is cut to fit a backed-up row, and says so (S2-13).
import { EMPTY_DRAFT } from '@/domain/recipes/draft';
import { rowFits } from '@/domain/sync/limits';
import { capDraft, CUT_NOTE, MAX_IMPORTED_TEXT } from './useLinkImport';

it('cuts very long ingredients and method so the recipe can still be backed up, and notes the cut', () => {
  const huge = { ...EMPTY_DRAFT, title: 'Big', ingredientsText: '鸡'.repeat(50_000), methodText: 'Stir.\n'.repeat(20_000) };
  const capped = capDraft(huge);
  expect(capped.ingredientsText).toHaveLength(MAX_IMPORTED_TEXT);
  expect(capped.methodText).toHaveLength(MAX_IMPORTED_TEXT);
  expect(capped.notesText).toBe(CUT_NOTE);
  expect(rowFits({ kind: 'myrecipe', key: 'my-big', data: capped, deleted: false, updatedAt: 1 })).toBe(true);
  expect(rowFits({ kind: 'myrecipe', key: 'my-big', data: huge, deleted: false, updatedAt: 1 })).toBe(false);
});

it('leaves a normal recipe alone', () => {
  const normal = { ...EMPTY_DRAFT, ingredientsText: '2 eggs', methodText: 'Whisk.', notesText: 'Nan’s' };
  expect(capDraft(normal)).toBe(normal);
});
