// Root Playwright config to enable HTML reports upload
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  timeout: 30000,
  workers: '50%',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ]
  ,projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } }
  ]
});
