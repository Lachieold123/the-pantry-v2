// Journey tests on the web build (D-040): the main paths through the app,
// tapped through in a phone-sized browser, light and dark. They run anywhere
// (Claude's workspace, a laptop, CI) with no simulator. Maestro still covers
// what only a real iPhone shows (sheets, keyboard, notifications, camera).
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 8790);

export default defineConfig({
  testDir: '.',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../e2e-report' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['iPhone 15 Pro'],
    // Chromium stands in for Safari: the app's web build behaves the same, and it runs everywhere.
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'light', use: { colorScheme: 'light' } },
    { name: 'dark', use: { colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'node e2e/web/serve.mjs',
    cwd: '../..',
    port,
    reuseExistingServer: true,
  },
});
