// What the account screens say (D-043): a heading for each moment the sheet
// is offered in, and every problem in plain words.
import type { Moment } from '@/domain/account/account';
import type { AccountProblem } from '@/store/accountActions';

type Pitch = { title: string; line: string };

/** Settings' row opens the sheet with no moment: the general case. */
export const PITCH: Record<Moment | 'settings', Pitch> = {
  settings: {
    title: 'Back up your kitchen',
    line: 'Your plan, list, cupboard, Cookmarks, collections, recipes and settings are kept in your account. Sign in on a new phone and it’s all there.',
  },
  household: {
    title: 'Keep your household if you change phones',
    line: 'Sign in and your household, plan and list come with you to a new phone, along with everything you’ve saved.',
  },
  cookmarks: {
    title: 'Back up what you’ve saved',
    line: 'Ten Cookmarks in. Sign in and they’re kept safe, with your collections and recipes, and come with you to a new phone.',
  },
  'own-recipe': {
    title: 'Back up what you’ve saved',
    line: 'Your own recipes live on this phone. Sign in and they’re kept safe, and come with you to a new phone.',
  },
};

export const SIGNED_IN_TOAST = 'You’re signed in. Your kitchen is backed up.';

export const NO_PASSWORD = 'No password. Everything keeps working without an account.';

export const PROBLEM_WORDS: Record<AccountProblem, string> = {
  offline: 'You’re offline. Signing in needs the internet.',
  cancelled: '',
  'code-wrong': 'That code isn’t right. Check the latest email and try again.',
  'code-expired': 'That code has expired. Send a new one.',
  'email-invalid': 'That email doesn’t look right. Check it and try again.',
  'too-many': 'Too many codes asked for. Wait a few minutes, then try again.',
  'sign-ins-off': 'Signing in isn’t switched on yet. It will be soon.',
  failed: 'Something went wrong. Try again in a moment.',
  unsaved: 'Some changes haven’t saved yet. Try again when you’re online.',
};
