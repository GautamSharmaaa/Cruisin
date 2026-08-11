import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:8100/api/v1';
const adminUrl = 'http://127.0.0.1:3101';
const storefrontUrl = 'http://127.0.0.1:3100';
const logisticsEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  APP_ENV: 'development',
  PORT: '8100',
  CLIENT_URL: storefrontUrl,
  ADMIN_URL: adminUrl,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests',
  REDIS_URL: 'redis://127.0.0.1:6379/15',
  JWT_ACCESS_SECRET: 'logistics-e2e-access-secret-0000000000000001',
  JWT_REFRESH_SECRET: 'logistics-e2e-refresh-secret-000000000000002',
  CLOUDINARY_CLOUD_NAME: 'logistics-e2e',
  CLOUDINARY_API_KEY: 'logistics-e2e',
  CLOUDINARY_API_SECRET: 'logistics-e2e',
  RAZORPAY_KEY_ID: 'rzp_test_mock_logistics',
  RAZORPAY_KEY_SECRET: 'razorpay_mock_logistics_secret',
  RAZORPAY_WEBHOOK_SECRET: 'razorpay_logistics_webhook_secret',
  COD_ENABLED: 'true',
  COD_CHECKOUT_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'stripe_mock_logistics_secret',
  STRIPE_WEBHOOK_SECRET: 'stripe_mock_logistics_webhook_secret',
  SENDGRID_API_KEY: 'SG.logistics-e2e',
  EMAIL_FROM: 'logistics@example.test',
  SHIPROCKET_ENABLED: 'true',
  SHIPROCKET_MODE: 'mock',
  SHIPROCKET_ALLOW_LIVE_READS: 'false',
  SHIPROCKET_ALLOW_LIVE_MUTATIONS: 'false',
  SHIPROCKET_PICKUP_LOCATION: 'Mock Warehouse',
  SHIPROCKET_PICKUP_POSTCODE: '560001',
  SHIPROCKET_WEBHOOK_SECRET: 'shiprocket_logistics_webhook_secret',
  SHIPROCKET_AUTO_CREATE_ORDER: 'true',
  SHIPROCKET_AUTO_CREATE_COD_ORDER: 'false',
  SHIPROCKET_AUTO_ASSIGN_AWB: 'false',
  SHIPROCKET_AUTO_SCHEDULE_PICKUP: 'false',
  LOGISTICS_WORKER_ENABLED: 'true',
  LOGISTICS_WORKER_POLL_MS: '1000',
  LOGISTICS_NOTIFICATIONS_ENABLED: 'true',
  LOGISTICS_EMAIL_NOTIFICATIONS_ENABLED: 'false',
  LOGISTICS_SMS_NOTIFICATIONS_ENABLED: 'false',
  LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
  LOGISTICS_E2E_SEED: 'true',
  PLAYWRIGHT_API_URL: apiUrl,
  PLAYWRIGHT_ADMIN_URL: adminUrl,
  PLAYWRIGHT_STOREFRONT_URL: storefrontUrl,
  NEXT_PUBLIC_API_URL: apiUrl
};

Object.assign(process.env, logisticsEnvironment);

export default defineConfig({
  testDir: './e2e',
  testMatch: /logistics-(matrix|documents)\.spec\.ts/,
  globalSetup: './e2e/logistics-global-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: adminUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'cd .. && npm --workspace server run logistics:e2e:serve',
      url: 'http://127.0.0.1:8100/ready',
      reuseExistingServer: false,
      timeout: 120_000,
      env: logisticsEnvironment
    },
    {
      command: 'cd .. && npm --workspace admin run dev -- --port 3101',
      url: adminUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...logisticsEnvironment, NODE_ENV: 'development' }
    }
  ],
  projects: [
    {
      name: 'logistics-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ]
});
