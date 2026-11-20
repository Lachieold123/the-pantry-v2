// What the household screens say when something doesn't work (D-039).
import type { Problem } from '@/store/household';

export const PROBLEM_WORDS: Record<Problem, string> = {
  offline: 'Couldn’t reach The Pantry. Check you’re online and try again.',
  'sharing-off': 'Sharing isn’t switched on yet. It will be soon.',
  // No promise about how long codes last: the live server's rules differ from the repo's until it's updated (DATA-13).
  'invite-not-found': 'That code didn’t work. Ask for a new one.',
  'signed-out': 'This phone’s sharing sign-in has expired. Ask someone in your household for a new code to rejoin.',
  'not-available': 'That isn’t available yet. It will be soon.',
  unsent: 'Some changes haven’t reached your household yet. Try again when you’re online.',
  'too-many-attempts': 'Too many codes that didn’t work. Wait an hour, then try again.',
  'household-full': 'That household is full (8 people).',
  'already-in-household': 'You’re already in a household. Leave it first to join another.',
  failed: 'Something went wrong. Try again in a moment.',
};

/** This phone has dropped out of a household: after signing in to another account (D-043), or when its sharing sign-in expired (DATA-4). */
export function rejoinWords(household: string, unsent: boolean): string {
  const kept = unsent ? ' Changes that hadn’t been sent are kept and go to them when you rejoin.' : '';
  return `This phone isn’t sharing ${household} any more. Your plan, list and cupboard are still here.${kept} To share again, ask someone in ${household} for a new invite.`;
}

export function inviteMessage(code: string): string {
  return `Come and share our kitchen on The Pantry: our plan, shopping list and cupboard.\n\nOpen this on your phone: thepantry://join/${code}\nOr in The Pantry, go to Settings → Household and enter ${code}.`;
}
