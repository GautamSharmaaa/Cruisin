import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /meta-pixel\.spec\.ts/,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:9/api/v1',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
      NEXT_PUBLIC_META_PIXEL_ID: '1197303799247402'
    }
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }]
});
