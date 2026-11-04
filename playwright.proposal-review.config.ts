import { defineConfig } from '@playwright/test';

// 只连接独立模拟环境，测试本身还会检查专属标记，避免向实际项目提交任务。
export default defineConfig({
  testDir: './tests',
  testMatch: 'proposal-review.spec.ts',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  outputDir: '../proposal-ui-test-results/playwright',
  reporter: [
    ['list'],
    ['html', { outputFolder: '../proposal-ui-test-results/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
});
