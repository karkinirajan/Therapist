import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke-test config for the Next.js 16 app. Runs against a production-style
 * `next build && next start` server (not `next dev`) since that's closer to
 * what actually ships and avoids dev-only quirks (React refresh, unminified
 * bundles) masking or causing failures that wouldn't show up in prod.
 *
 * Scoped to Chromium only on purpose — this is a smoke suite for a small
 * app, not a cross-browser compatibility matrix. Add Firefox/WebKit
 * projects if/when that's actually needed.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
