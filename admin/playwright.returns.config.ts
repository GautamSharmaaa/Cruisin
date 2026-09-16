import { defineConfig, devices } from '@playwright/test';

const adminUrl = 'http://localhost:3101';

export default defineConfig({
  testDir: './e2e',
  testMatch: /return-workflow\.spec\.ts/,
  workers: 1,
  use: { baseURL: adminUrl, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: '../node_modules/.bin/next start -H 127.0.0.1 -p 3101',
    url: adminUrl,
    reuseExistingServer: false,
    timeout: 60_000
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
