import { defineConfig, devices } from '@playwright/test';

const useProductionServers = process.env.PLAYWRIGHT_PRODUCTION_SERVERS === 'true';
const frontendNodeEnv = useProductionServers ? 'production' : (process.env.NODE_ENV ?? 'development');
const apiNodeEnv = useProductionServers ? 'test' : (process.env.NODE_ENV ?? 'development');

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
      command: useProductionServers ? 'cd .. && npm --workspace client run start' : 'cd .. && npm --workspace client run dev',
      url: process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: frontendNodeEnv }
    },
    {
      command: useProductionServers ? 'cd .. && npm --workspace admin run start' : 'cd .. && npm --workspace admin run dev',
      url: process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: frontendNodeEnv }
    },
    {
      command: useProductionServers ? 'cd .. && npm --workspace server run start' : 'cd .. && npm --workspace server run dev',
      url: (process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/api\/v1$/, '') + '/health',
      reuseExistingServer: true,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: apiNodeEnv }
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Pixel 5'] } },
    { name: 'firefox', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } }
  ]
});
