// A plate: a photo of something you cooked, with a name and a few words
// (v1's "bite", the centre "+" post; D-033). Until accounts and social
// arrive (P9) plates stay on this phone and only you see them; the shape is
// the post's, so they can be shared later without changing.

import { DIFFICULTY_LABELS, formatMinutes } from '../recipes/labels';
import type { Difficulty } from '../recipes/types';

export const PLATE_LIMITS = { photos: 5, title: 60, caption: 500 } as const;

export type PlateDraft = {
  photoUris: string[];
  title: string;
  caption: string;
  minutes: number;
  serves: number;
  difficulty: Difficulty | undefined;
  /** The recipe it was cooked from, when it was one of ours or yours. */
  recipeId: string | undefined;
};

export type Plate = Omit<PlateDraft, 'difficulty' | 'recipeId'> & {
  id: string;
  createdAt: number;
  difficulty?: Difficulty | undefined;
  recipeId?: string | undefined;
};

export const EMPTY_PLATE: PlateDraft = {
  photoUris: [],
  title: '',
  caption: '',
  minutes: 30,
  serves: 2,
  difficulty: undefined,
  recipeId: undefined,
};

/** Why it can't be shared yet, in the order the cook would fix them. Empty means ready. */
export function plateProblems(draft: PlateDraft): string[] {
  const problems: string[] = [];
  if (draft.photoUris.length === 0) problems.push('Add a photo');
  if (!draft.title.trim()) problems.push('Name the dish');
  return problems;
}

/** True when there's anything worth keeping as a draft. */
export function draftHasContent(draft: PlateDraft): boolean {
  return draft.photoUris.length > 0 || draft.title.trim() !== '' || draft.caption.trim() !== '';
}

export function makePlate(draft: PlateDraft, id: string, now: number): Plate {
  const { difficulty, recipeId, ...rest } = draft;
  return {
    ...rest,
    title: draft.title.trim().slice(0, PLATE_LIMITS.title),
    caption: draft.caption.trim().slice(0, PLATE_LIMITS.caption),
    photoUris: draft.photoUris.slice(0, PLATE_LIMITS.photos),
    id,
    createdAt: now,
    ...(difficulty ? { difficulty } : {}),
    ...(recipeId ? { recipeId } : {}),
  };
}

/** Adds photos up to the limit, skipping ones already there. */
export function addPhotos(draft: PlateDraft, uris: readonly string[]): PlateDraft {
  const next = [...draft.photoUris];
  for (const u of uris) if (!next.includes(u) && next.length < PLATE_LIMITS.photos) next.push(u);
  return { ...draft, photoUris: next };
}

/** Linking a recipe fills the blanks from it, never over what the cook typed. */
export function linkRecipe(
  draft: PlateDraft,
  recipe: { id: string; title: string; totalMinutes: number; servings: number; difficulty: Difficulty },
): PlateDraft {
  return {
    ...draft,
    recipeId: recipe.id,
    title: draft.title.trim() ? draft.title : recipe.title,
    minutes: recipe.totalMinutes > 0 ? recipe.totalMinutes : draft.minutes,
    serves: recipe.servings,
    difficulty: draft.difficulty ?? recipe.difficulty,
  };
}

/** "45m · Serves 4 · Easy", the line under a plate. */
export function plateMeta(p: Pick<PlateDraft, 'minutes' | 'serves'> & { difficulty?: Difficulty | undefined }): string {
  return [p.minutes > 0 ? formatMinutes(p.minutes) : '', `Serves ${p.serves}`, p.difficulty ? DIFFICULTY_LABELS[p.difficulty] : '']
    .filter(Boolean)
    .join(' · ');
}
