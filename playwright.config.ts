import { defineConfig, devices } from '@playwright/test';
const apiPort = process.env.PAPER_AGENT_E2E_API_PORT || '8001';
const webPort = process.env.PAPER_AGENT_E2E_WEB_PORT || '5174';
export default defineConfig({
  testDir: './tests',
  testIgnore: 'proposal-review.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1512, height: 1080 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ['--no-sandbox'],
    },
  },
  webServer: [
    {
      command: 'node scripts/e2e-server.mjs',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npm run preview -- --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      env: { PAPER_AGENT_API_URL: `http://127.0.0.1:${apiPort}` },
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
