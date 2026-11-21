import { defineConfig, devices } from '@playwright/test';
const apiPort = process.env.BATTERYSCIENTIST_E2E_API_PORT || '8001';
const webPort = process.env.BATTERYSCIENTIST_E2E_WEB_PORT || '5174';
const testDist = '.e2e-dist';
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
      command: `npm run build -- --outDir ${testDist} && npm run preview -- --outDir ${testDist} --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      env: { BATTERYSCIENTIST_API_URL: `http://127.0.0.1:${apiPort}` },
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
