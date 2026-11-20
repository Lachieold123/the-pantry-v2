// L2 journeys 1: Plan -> Shop -> Cook on the web build (:4412), Supabase blocked.
import type { Page } from '@playwright/test';
import { done, ONBOARDED, openApp, shot, store } from './lib';

const log = (...a: unknown[]) => console.log(...a);
async function step(name: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { log(`!! ${name}: ${(e as Error).message.split('\n')[0]}`); }
}
const txt = async (page: Page, id: string) => (await page.getByTestId(id).first().innerText({ timeout: 3000 }).catch(() => '<missing>')).replace(/\s+/g, ' ');

async function main() {
  // 1. Plan from the recipe page, double tap on confirm.
  {
    const { page, errors } = await openApp('/recipe/carbonara', ONBOARDED);
    await step('plan double tap', async () => {
      await page.getByTestId('recipe-plan').click();
      await page.getByTestId('plan-day-this-0').click();
      await page.getByTestId('plan-confirm').dblclick();
      await page.waitForTimeout(800);
      const plan = JSON.parse((await store(page, 'plan')) ?? '{}');
      log('1 plan entries after double tap:', plan.state?.entries?.length, JSON.stringify(plan.state?.entries?.map((e: { day: string; slot: string; servings: number }) => `${e.day}/${e.slot}/${e.servings}`)));
    });
    // 2. List: tick egg, then raise servings in the plan -> egg should untick.
    await step('tick holds until more needed', async () => {
      await page.goto('http://localhost:4412/list');
      await page.waitForTimeout(800);
      log('2 list egg before:', await txt(page, 'shopping-item-egg'), '| count', await txt(page, 'shopping-count'));
      await page.getByTestId('shopping-item-egg').click();
      await page.waitForTimeout(300);
      log('2 count after tick:', await txt(page, 'shopping-count'));
      const plan = JSON.parse((await store(page, 'plan')) ?? '{}');
      const id = plan.state.entries[0].id;
      await page.goto('http://localhost:4412/plan');
      await page.waitForTimeout(800);
      await page.getByTestId(`plan-entry-${id}-servings`).click();
      await page.waitForTimeout(400);
      await shot(page, 'j1-plan-servings-sheet');
      const stepper = page.getByTestId(`plan-entry-${id}-stepper`);
      log('2 stepper text:', (await stepper.innerText().catch(() => '<none>')).replace(/\s+/g, ' '));
      const plus = stepper.getByRole('button').last();
      for (let i = 0; i < 30; i++) await plus.click({ timeout: 1000 }).catch(() => undefined);
      log('2 stepper after 30 plus:', (await stepper.innerText()).replace(/\s+/g, ' '));
      await page.getByTestId('plan-servings-done').click().catch(() => undefined);
      await page.goto('http://localhost:4412/list');
      await page.waitForTimeout(800);
      log('2 egg after servings up:', await txt(page, 'shopping-item-egg'), '| aria-checked', await page.getByTestId('shopping-item-egg').getAttribute('aria-checked'), '| count', await txt(page, 'shopping-count'));
      await shot(page, 'j1-list-after-servings');
      const cup = JSON.parse((await store(page, 'cupboard')) ?? '{}');
      log('2 cupboard after tick (moveTickedToCupboard):', JSON.stringify(cup.state?.items?.map((i: { ingredientId: string }) => i.ingredientId)));
    });
    // 3. Share the list: what text?
    await step('list share', async () => {
      await page.evaluate(() => { (navigator as unknown as { share: unknown }).share = (d: unknown) => { (window as unknown as { shared: unknown }).shared = d; return Promise.resolve(); }; });
      await page.getByTestId('shopping-share').click();
      await page.waitForTimeout(500);
      log('3 shared:', JSON.stringify(await page.evaluate(() => (window as unknown as { shared: unknown }).shared)).slice(0, 400));
      log('3 body after share:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200));
    });
    log('errors', errors.filter((e) => !e.includes('ERR_FAILED')).slice(0, 4));
    await page.context().close();
  }

  // 4. Recipe page servings sheet bounds and units.
  {
    const { page, errors } = await openApp('/recipe/carbonara', { ...ONBOARDED, preferences: { ...ONBOARDED.preferences, units: 'imperial' } });
    await step('servings bounds', async () => {
      log('4 ingredients (imperial):', (await page.locator('[data-testid^="ingredient-"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | ').slice(0, 300));
      await page.getByTestId('recipe-servings').click();
      await page.waitForTimeout(400);
      const st = page.getByTestId('servings-stepper');
      const minus = st.getByRole('button').first();
      for (let i = 0; i < 10; i++) await minus.click({ timeout: 800 }).catch(() => undefined);
      log('4 servings at min:', (await st.innerText()).replace(/\s+/g, ' '));
      const plus = st.getByRole('button').last();
      for (let i = 0; i < 60; i++) await plus.click({ timeout: 800 }).catch(() => undefined);
      log('4 servings at max:', (await st.innerText()).replace(/\s+/g, ' '));
      await page.getByTestId('servings-done').click();
      await page.waitForTimeout(300);
      log('4 ingredients at max:', (await page.locator('[data-testid^="ingredient-"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | ').slice(0, 300));
      await shot(page, 'j1-recipe-max-servings-imperial');
      await page.reload();
      await page.waitForTimeout(800);
      log('4 servings after reload:', await txt(page, 'recipe-servings'));
    });
    // 5. Ingredient ticks on the recipe page survive a reload?
    await step('ingredient ticks', async () => {
      const first = page.locator('[data-testid^="ingredient-"]').first();
      await first.click();
      log('5 tick state:', await first.getAttribute('aria-checked'));
      await page.reload();
      await page.waitForTimeout(800);
      log('5 after reload:', await page.locator('[data-testid^="ingredient-"]').first().getAttribute('aria-checked'));
    });
    log('errors', errors.filter((e) => !e.includes('ERR_FAILED')).slice(0, 4));
    await page.context().close();
  }

  // 6. Cook Mode: timers, Used up, double Done.
  {
    const { page, errors } = await openApp('/recipe/carbonara/cook?servings=4', { ...ONBOARDED, cupboard: { items: ['egg', 'spaghetti', 'pecorino', 'guanciale'].map((ingredientId) => ({ ingredientId, addedAt: 1, source: 'manual' })), shelf: { mode: 'assume', ids: [] }, moveTickedToCupboard: true } });
    await step('cook mode', async () => {
      const steps: string[] = [];
      for (let i = 0; i < 20; i++) {
        steps.push(`${await txt(page, 'cook-counter')}: ${(await txt(page, 'cook-step-text')).slice(0, 80)}`);
        const timers = page.locator('[role="button"]', { hasText: /\d+\s*(min|minute|hour|sec)/i });
        if ((await timers.count()) && i < 6) { await timers.first().click().catch(() => undefined); }
        if (await page.getByTestId('cook-done').count()) break;
        await page.getByTestId('cook-next').click();
        await page.waitForTimeout(150);
      }
      log('6 steps:\n   ' + steps.join('\n   '));
      log('6 timers running:', await page.locator('[data-testid^="cook-timer-"]').count(), (await page.locator('[data-testid^="cook-timer-"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | ').slice(0, 200));
      await shot(page, 'j1-cook-last-step');
      await page.getByTestId('cook-done').dblclick();
      await page.waitForTimeout(800);
      log('6 after done:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300));
      await shot(page, 'j1-cook-after-done');
      if (await page.getByTestId('used-up-sheet').count()) {
        await page.getByTestId('used-up-egg').click().catch(() => log('no used-up-egg'));
        await page.getByTestId('used-up-done').click();
        await page.waitForTimeout(500);
      }
      const logStore = JSON.parse((await store(page, 'cook-log')) ?? '{}');
      log('6 cook log entries:', logStore.state?.log?.length);
      const cup = JSON.parse((await store(page, 'cupboard')) ?? '{}');
      log('6 cupboard after used-up:', JSON.stringify(cup.state?.items?.map((i: { ingredientId: string }) => i.ingredientId)));
    });
    log('errors', errors.filter((e) => !e.includes('ERR_FAILED')).slice(0, 4));
    await page.context().close();
  }
  await done();
}
main();
