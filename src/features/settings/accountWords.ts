// What Settings says when signing out or deleting the account doesn't work
// (D-043). Settings can't borrow the account feature's words (features stay
// apart), and only these few can happen here.
import type { AccountProblem } from '@/store/accountActions';

export function accountProblemWords(problem: AccountProblem): string {
  if (problem === 'unsaved') return 'Some changes haven’t saved yet. Try again when you’re online.';
  if (problem === 'offline') return 'You’re offline. Try again when you’re back online.';
  return 'Something went wrong. Try again in a moment.';
}
