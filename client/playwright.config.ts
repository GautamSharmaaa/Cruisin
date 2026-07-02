import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'cd .. && npm --workspace client run dev',
      url: process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'cd .. && npm --workspace admin run dev',
      url: process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'cd .. && npm --workspace server run dev',
      url: (process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/api\/v1$/, '') + '/health',
      reuseExistingServer: true,
      timeout: 120000
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
  ]
});
