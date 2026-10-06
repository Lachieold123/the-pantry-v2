// What the household screens say when something doesn't work (D-039).
import type { Problem } from '@/store/household';

export const PROBLEM_WORDS: Record<Problem, string> = {
  offline: 'Couldn’t reach The Pantry. Check you’re online and try again.',
  'sharing-off': 'Sharing isn’t switched on yet. It will be soon.',
  'invite-not-found': 'That code didn’t work. Codes last two weeks; ask for a new one.',
  'household-full': 'That household is full (8 people).',
  'already-in-household': 'You’re already in a household. Leave it first to join another.',
  failed: 'Something went wrong. Try again in a moment.',
};

/** "Sam", "Sam and Alex", "Sam, Alex and Jo". */
export function namesList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function inviteMessage(code: string): string {
  return `Come and share our kitchen on The Pantry: our plan, shopping list and cupboard.\n\nOpen this on your phone: thepantry://join/${code}\nOr in The Pantry, go to Settings → Household and enter ${code}.`;
}
