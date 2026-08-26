import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the original, localStorage-only app pages.
 *
 * IMPORTANT deviation from a plain reading of the task spec: `proxy.ts`
 * (apps/web/proxy.ts) currently gates `/intake` and `/tools` behind the
 * `refresh_token` cookie, same as `/checkin`, `/roadmap`, and `/progress` —
 * it is NOT just `/dashboard`/`/checkin`/`/roadmap`/`/progress`/`/account`.
 * Only `/` and `/safety` are reachable without a session. That means, as
 * written today, `/intake` and `/tools` do NOT render their
 * form/accordion content for a signed-out visitor — they redirect to
 * `/login`. This file tests the ACTUAL behavior (verified by reading
 * proxy.ts's PROTECTED_PREFIXES list) rather than the assumption that those
 * two pages are still publicly reachable; the redirect itself is covered by
 * protected-routes.spec.ts. Flagging this prominently since it reads like a
 * product-level discrepancy worth a decision, not just a test-writing
 * detail — see the final report.
 */

test.describe("/ (dashboard, unauthenticated, no baseline)", () => {
  test("shows the identity statement and a link to start intake", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "CBT Recovery & Life-Systems Coach" }),
    ).toBeVisible();
    await expect(
      page.getByText(/not a psychiatrist and not a crisis service/i),
    ).toBeVisible();
    // <Button asChild><Link>...</Link></Button> — Base UI's Button
    // primitive renders `role="button"` on the underlying element even
    // though it's an <a>, confirmed against the actual accessibility tree.
    await expect(
      page.getByRole("button", { name: /start the first-session intake/i }),
    ).toBeVisible();
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
  test("navigates between the dashboard and the always-reachable Safety page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "CBT Recovery & Life-Systems Coach" })).toBeVisible();

    // Same Button-asChild-on-an-<a> role note as above: "Crisis Support" is
    // exposed as role="button", not "link".
    await page.getByRole("button", { name: /crisis support/i }).click();
    await expect(page).toHaveURL(/\/safety$/);
    await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "CBT Recovery", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "CBT Recovery & Life-Systems Coach" })).toBeVisible();
  });
});
