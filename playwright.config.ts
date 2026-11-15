import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    // The demo clinic's address; the marketing site is the bare host (see lib/tenant).
    baseURL: 'http://demo.localhost:3100',
    trace: 'on-first-retry',
  },
  // PLAYWRIGHT_CHANNEL=chrome runs the installed Chrome instead of Playwright's own download (local runs).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined } },
  ],
  webServer: {
    // Production build on its own port: closer to real use, and no dev overlay over the UI.
    command:
      'NEXT_PUBLIC_ROOT_DOMAIN=localhost:3100 bun run build && NEXT_PUBLIC_ROOT_DOMAIN=localhost:3100 bun run start --port 3100',
    url: 'http://demo.localhost:3100/login',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
