import { defineConfig, devices } from '@playwright/test';

const useProductionServers = process.env.PLAYWRIGHT_PRODUCTION_SERVERS === 'true';
const frontendNodeEnv = useProductionServers ? 'production' : (process.env.NODE_ENV ?? 'development');
const apiNodeEnv = useProductionServers ? 'test' : (process.env.NODE_ENV ?? 'development');
const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const port = (url: string, fallback: string): string => new URL(url).port || fallback;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVERS === 'true';

export default defineConfig({
  testDir: './e2e',
  testIgnore: [/logistics-(matrix|documents)\.spec\.ts/, /meta-pixel\.spec\.ts/],
  workers: 1,
  use: {
    baseURL: storefrontUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: useProductionServers ? 'cd .. && npm --workspace client run start' : 'cd .. && npm --workspace client run dev',
      url: storefrontUrl,
      reuseExistingServer,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: frontendNodeEnv, PORT: port(storefrontUrl, '3000') }
    },
    {
      command: useProductionServers ? 'cd .. && npm --workspace admin run start' : 'cd .. && npm --workspace admin run dev',
      url: adminUrl,
      reuseExistingServer,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: frontendNodeEnv, PORT: port(adminUrl, '3001') }
    },
    {
      command: useProductionServers ? 'cd .. && npm --workspace server run start' : 'cd .. && npm --workspace server run dev',
      url: apiUrl.replace(/\/api\/v1$/, '') + '/health',
      reuseExistingServer,
      timeout: 120000,
      env: { ...process.env, NODE_ENV: apiNodeEnv, PORT: port(apiUrl, '8000') }
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Pixel 5'] } },
    { name: 'firefox', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', testMatch: /cross-browser\.spec\.ts/, use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } }
  ]
});
