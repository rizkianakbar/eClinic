import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Production build on its own port: closer to real use, and no dev overlay over the UI.
    command: 'bun run build && bun run start --port 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
