import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the public marketing landing page ("/") and the always-
 * reachable Safety page.
 *
 * Renamed in spirit from its original scope (the old localStorage-only
 * dual-purpose "/" dashboard) — that page no longer exists. "/" is now a
 * genuine, unauthenticated Server Component landing page with no
 * useRecoveryData/localStorage dependency; signed-in visitors are redirected
 * to /dashboard by proxy.ts before this page ever renders for them (covered
 * by protected-routes.spec.ts's sibling assertions, not duplicated here
 * since it requires a live-API signup to get a real session cookie — see
 * the root task's manual verification notes).
 */

test.describe("/ (public landing page, unauthenticated)", () => {
  test("shows the hero and primary CTAs", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { name: /structure the days willpower alone can.t carry/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  });
});

test.describe("/safety", () => {
  test("is reachable without auth and shows crisis helpline content", async ({ page }) => {
    const response = await page.goto("/safety");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Call now" })).toBeVisible();
    await expect(page.getByRole("link", { name: /call .* — /i })).toBeVisible();
  });
});

test.describe("header nav", () => {
  test("navigates between the landing page and the always-reachable Safety page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /structure the days willpower alone can.t carry/i }),
    ).toBeVisible();

    // Same Button-asChild-on-an-<a> role note as elsewhere in this suite:
    // "Crisis Support" is exposed as role="button", not "link".
    await page.getByRole("button", { name: /crisis support/i }).click();
    await expect(page).toHaveURL(/\/safety$/);
    await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Therapist", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /structure the days willpower alone can.t carry/i }),
    ).toBeVisible();
  });
});
