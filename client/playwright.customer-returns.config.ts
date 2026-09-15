import { defineConfig, devices } from '@playwright/test';

const storefrontUrl = 'http://localhost:3100';

// Only the storefront runs here. Every API request is mocked in the spec;
// no database, Shiprocket, or payment provider is contacted.
export default defineConfig({
  testDir: './e2e',
  testMatch: /customer-delivery-state\.spec\.ts/,
  workers: 1,
  use: { baseURL: storefrontUrl, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: '../node_modules/.bin/next start -H 127.0.0.1 -p 3100',
    url: storefrontUrl,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
