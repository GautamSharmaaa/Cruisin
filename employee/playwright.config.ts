import { defineConfig, devices } from "@playwright/test";
const origin = process.env.PLAYWRIGHT_EMPLOYEE_URL ?? "http://127.0.0.1:3194";
for (const value of [
  origin,
  process.env.PLAYWRIGHT_STOREFRONT_URL ?? "http://127.0.0.1:3192",
  process.env.PLAYWRIGHT_ADMIN_URL ?? "http://127.0.0.1:3193",
  process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8192",
])
  if (!["localhost", "127.0.0.1"].includes(new URL(value).hostname))
    throw new Error("Operations browser tests refuse nonlocal targets");
export default defineConfig({
  testDir: "./e2e",
  timeout: 180000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
