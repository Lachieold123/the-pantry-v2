// The editor's state: the draft being typed, whether it has changed, and
// what it would build into right now. Saving keeps unfinished recipes too,
// so nobody loses Nan's recipe because the method isn't typed in yet.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { buildRecipe, EMPTY_DRAFT, myRecipeId, type RecipeDraft } from '@/domain/recipes/draft';
import { useMyRecipes } from '@/store/myRecipes';
import { useToast } from '@/ui/patterns/Toast';
import { usePendingImport } from './pendingImport';

export function useRecipeEditor(id: string | undefined, fromImport: boolean) {
  const router = useRouter();
  const toast = useToast();
  const existing = useMyRecipes((s) => (id ? s.recipes[id] : undefined));
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

  const built = useMemo(() => buildRecipe(id ?? 'my-new', draft, source, INGREDIENTS), [draft, id, source]);

  const update = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const store = () => {
    const recipeId = id ?? myRecipeId(draft.title, Math.random().toString(36).slice(2, 6));
    saveRecipe({ id: recipeId, draft: { ...draft, title: draft.title.trim() }, source, sourceUrl });
    usePendingImport.getState().set(undefined);
    setDirty(false);
    return recipeId;
  };

  /** Saves a finished recipe. If something's missing, shows what instead and stays put. */
  const save = () => {
    setShowProblems(true);
    if (!draft.title.trim() || !built.recipe) return;
    const recipeId = store();
    toast({ message: id ? 'Changes saved' : 'Recipe saved' });
    if (id) router.back();
    else router.replace({ pathname: '/recipe/[id]', params: { id: recipeId } });
  };

  /** Keeps an unfinished recipe to come back to. Only needs a name. */
  const saveDraft = () => {
    setShowProblems(true);
    if (!draft.title.trim()) return;
    store();
    toast({ message: 'Saved to finish later' });
    router.navigate({ pathname: '/saved', params: { show: 'mine' } });
  };

  const remove = () => {
    if (!id) return;
    const removed = removeRecipe(id);
    if (removed) toast({ message: `${removed.draft.title} deleted`, undo: () => restoreRecipe(removed) });
    // The recipe page underneath would now be empty, so go back to where your recipes live.
    router.navigate({ pathname: '/saved', params: { show: 'mine' } });
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
    problem,
    titleProblem,
    sourceUrl,
    isNew: !id,
    exists: !id || existing !== undefined,
  };
}
