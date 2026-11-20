// What the household screens say when something doesn't work (D-039).
import type { Problem } from '@/store/household';

export const PROBLEM_WORDS: Record<Problem, string> = {
  offline: 'Couldn’t reach The Pantry. Check you’re online and try again.',
  'sharing-off': 'Sharing isn’t switched on yet. It will be soon.',
  'invite-not-found': 'That code didn’t work. Each code lets one person join and lasts two days; ask for a new one.',
  'too-many-attempts': 'Too many codes that didn’t work. Wait an hour, then try again.',
  'household-full': 'That household is full (8 people).',
  'already-in-household': 'You’re already in a household. Leave it first to join another.',
  failed: 'Something went wrong. Try again in a moment.',
};

export function inviteMessage(code: string): string {
  return `Come and share our kitchen on The Pantry: our plan, shopping list and cupboard.\n\nOpen this on your phone: thepantry://join/${code}\nOr in The Pantry, go to Settings → Household and enter ${code}.`;
}
