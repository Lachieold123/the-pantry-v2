// What Settings says when signing out or deleting the account doesn't work
// (D-043). Settings can't borrow the account feature's words (features stay
// apart), and only these few can happen here.
import type { AccountProblem } from '@/store/accountActions';

export function accountProblemWords(problem: AccountProblem): string {
  if (problem === 'unsaved') return 'Some changes haven’t saved yet. Try again when you’re online.';
  if (problem === 'offline') return 'You’re offline. Try again when you’re back online.';
  return 'Something went wrong. Try again in a moment.';
}

/** Signed out where there's no way in yet (the web, Android, before email codes): where backing up does work. */
export const BACKUP_ON_IPHONE = 'Backing up with your Apple ID is available on iPhone.';
