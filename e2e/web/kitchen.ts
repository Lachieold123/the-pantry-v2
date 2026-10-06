// Test helpers: start the app with a saved state (onboarded, a stocked
// cupboard, a plan), and fail any test that throws in the page.
import { expect, test as base, type Page } from '@playwright/test';

const PREFIX = 'the-pantry-v2';

export type Seed = Partial<Record<'preferences' | 'plan' | 'cupboard' | 'saved' | 'tour' | 'pro' | 'household' | 'my-recipes', unknown>>;

const VERSIONS: Record<keyof Seed, number> = {
  preferences: 3,
  plan: 1,
  cupboard: 2,
  saved: 1,
  tour: 1,
  pro: 1,
  household: 1,
  'my-recipes': 1,
};

export const ONBOARDED: Seed = {
  preferences: { onboarded: true, appearance: 'system', diet: 'everything' },
  tour: { seen: true },
};

export const STOCKED: Seed = {
  ...ONBOARDED,
  cupboard: {
    items: [
      'egg',
      'butter',
      'milk',
      'plain-flour',
      'cheddar',
      'tomato',
      'brown-onion',
      'garlic',
      'white-rice',
      'chicken-thigh',
      'soy-sauce',
      'spinach',
      'potato',
      'lemon',
      'parmesan',
      'spaghetti',
      'bacon',
      'olive-oil',
    ].map((ingredientId) => ({ ingredientId, addedAt: 1, source: 'manual' })),
    shelf: { mode: 'assume', ids: [] },
    moveTickedToCupboard: true,
  },
};

/** Opens the app at `path` with this saved state (nothing saved: a first launch). */
export async function open(page: Page, path: string, seed: Seed = {}): Promise<void> {
  await page.addInitScript(
    ({ prefix, entries }: { prefix: string; entries: [string, string][] }) => {
      // Seed once per tab: a reload keeps whatever the test changed.
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      for (const [key, value] of entries) localStorage.setItem(`${prefix}/${key}`, value);
    },
    {
      prefix: PREFIX,
      entries: Object.entries(seed).map(([k, state]): [string, string] => [
        k,
        JSON.stringify({ state, version: VERSIONS[k as keyof Seed] }),
      ]),
    },
  );
  await page.goto(path);
}

/** Every test fails if the page throws, even when the screen looks fine. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await use(errors);
      expect(errors, 'the page threw').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** "12 items" → 12. */
export async function countIn(page: Page, testId: string): Promise<number> {
  return Number.parseInt((await page.getByTestId(testId).innerText()).replace(/\D+/g, ' ').trim(), 10);
}

/** A date as the app stores it, n days from today. */
export function isoDay(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
