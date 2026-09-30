// The editor's state: the draft being typed, whether it has changed, and
// what it would build into right now. Saving keeps unfinished recipes too,
// so nobody loses Nan's recipe because the method isn't typed in yet.
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { buildRecipe, EMPTY_DRAFT, myRecipeId, type RecipeDraft } from '@/domain/recipes/draft';
import { newId } from '@/lib/ids';
import { goBackOr } from '@/lib/navigation';
import { ownRecipe, useMyRecipes } from '@/store/myRecipes';
import { useToast } from '@/ui/patterns/Toast';
import { usePendingImport } from '@/store/pendingImport';
import { useLeaveGuard } from './useLeaveGuard';

export function useRecipeEditor(id: string | undefined, fromImport: boolean) {
  const router = useRouter();
  const toast = useToast();
  const existing = useMyRecipes((s) => (id ? ownRecipe(s.recipes, id) : undefined));
  const saveRecipe = useMyRecipes((s) => s.save);
  const removeRecipe = useMyRecipes((s) => s.remove);
  const restoreRecipe = useMyRecipes((s) => s.restore);

  // Read once: the import waiting for review becomes this editor's starting point.
  const [imported] = useState(() => (fromImport && !id ? usePendingImport.getState().pending : undefined));
  const source = existing?.source ?? (imported ? 'imported' : 'user');
  const sourceUrl = existing?.sourceUrl ?? imported?.url;

  const [draft, setDraft] = useState<RecipeDraft>(existing?.draft ?? imported?.draft ?? EMPTY_DRAFT);
  const [dirty, setDirty] = useState(imported !== undefined);
  // Problems show only after the first save attempt, so a blank form doesn't start out shouting.
  const [showProblems, setShowProblems] = useState(false);
  const guard = useLeaveGuard(dirty);

  const built = useMemo(() => buildRecipe(id ?? 'my-new', draft, source, INGREDIENTS), [draft, id, source]);
  // A recipe that was finished when the editor opened. Saving it half-done would
  // drop it out of the plan, Cookmarks and collections, so it can't be parked as a draft.
  const [wasFinished] = useState(
    () => existing !== undefined && buildRecipe(existing.id, existing.draft, existing.source, INGREDIENTS).recipe !== undefined,
  );
  // Set on the first save so a double tap can't store the recipe twice; the screen is leaving anyway.
  const saving = useRef(false);

  const update = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  // Close the editor first, then go down to My recipes, or open it if it isn't
  // underneath. Navigating from the editor pushed My recipes on top of it, so
  // Back reopened a stale editor and saving again made a duplicate (audit F56).
  const toMyRecipes = () => {
    if (router.canGoBack()) router.dismiss();
    router.dismissTo('/my-recipes');
  };

  /** Stores the draft once, returning its id, or undefined if it was already saved or the new id is taken. */
  const store = (): string | undefined => {
    if (saving.current) return undefined;
    const recipeId = id ?? myRecipeId(draft.title, newId());
    if (!saveRecipe({ id: recipeId, draft: { ...draft, title: draft.title.trim() }, source, sourceUrl }, { isNew: !id })) return undefined;
    saving.current = true;
    usePendingImport.getState().set(undefined);
    setDirty(false);
    return recipeId;
  };

  /** Saves a finished recipe. If something's missing, shows what instead and stays put. */
  const save = () => {
    setShowProblems(true);
    if (!draft.title.trim() || !built.recipe) return;
    const recipeId = store();
    if (!recipeId) return;
    toast({ message: id ? 'Changes saved' : 'Recipe saved' });
    guard.leave(() => (id ? goBackOr(router) : router.replace({ pathname: '/recipe/[id]', params: { id: recipeId } })));
  };

  /** Keeps an unfinished recipe to come back to. Only needs a name. */
  const saveDraft = () => {
    setShowProblems(true);
    if (!draft.title.trim() || wasFinished || !store()) return;
    toast({ message: 'Saved to finish later' });
    guard.leave(toMyRecipes);
  };

  const remove = () => {
    if (!id) return;
    const removed = removeRecipe(id);
    if (removed) toast({ message: `${removed.draft.title} deleted`, undo: () => restoreRecipe(removed) });
    // The recipe page underneath would now be empty, so go back to where your recipes live.
    guard.leave(toMyRecipes);
  };

  const problem = (field: string) => (showProblems ? built.problems.find((p) => p.field === field)?.message : undefined);
  const titleProblem = showProblems && !draft.title.trim() ? 'Give it a name.' : undefined;

  return {
    draft,
    update,
    dirty,
    built,
    save,
    saveDraft,
    showProblems,
    remove,
    /** Offer "Discard changes" rather than "Save to finish later" (see wasFinished). */
    canSaveDraft: !wasFinished,
    problem,
    titleProblem,
    sourceUrl,
    guard,
    isNew: !id,
    exists: !id || existing !== undefined,
  };
}
