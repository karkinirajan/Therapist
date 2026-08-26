import { test, expect } from "@playwright/test";

/**
 * proxy.ts (apps/web/proxy.ts) redirects any request to a protected prefix
 * to /login when there's no `refresh_token` cookie. A fresh Playwright
 * browser context has no cookies at all, so any one protected path is
 * enough to prove the gate works — the other protected prefixes
 * (/dashboard, /roadmap, /tools, /progress, /account, /intake) all share
 * the exact same `isProtectedPath` check, so testing all of them would be
 * redundant.
 */
test("visiting a protected route while signed out redirects to /login", async ({ page }) => {
  const response = await page.goto("/checkin");

  await expect(page).toHaveURL(/\/login\?from=%2Fcheckin$/);
  expect(response?.status()).toBe(200); // the final response, after following the redirect
  await expect(page.getByRole("heading", { name: "Log in", exact: true })).toBeVisible();
});
