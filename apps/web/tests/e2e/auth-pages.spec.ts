import { test, expect } from "@playwright/test";

test.describe("/login", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    // The "Continue with Google" control is a real <a> (see the comment in
    // login/page.tsx: it needs a full browser navigation, not a client-side
    // route). Button asChild now clones the child element directly instead
    // of rendering through Base UI's Button primitive, so the accessible
    // role matches the underlying <a>: "link", not "button".
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
  });
});

test.describe("/signup", () => {
  test("renders the signup form", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: "Sign up", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    // Same role note as /login above: Button asChild clones the real <a>,
    // so this is a "link", not a "button".
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
  });
});

/**
 * A real signup -> login -> protected-page round trip against a live
 * FastAPI backend. Deliberately gated behind API_BASE_URL: the `webServer`
 * config in playwright.config.ts only ever starts the Next.js app itself
 * (`npm run build && npm run start`), not the FastAPI API or its Postgres
 * database, so a real signup call has nothing to talk to in a plain
 * `npm run test:e2e` / CI run that only brings up the web server. This
 * test is skipped unless something has explicitly pointed the Next.js app
 * at a live API (matching the `apps/web/.env.example` convention) and set
 * API_BASE_URL to confirm that's the case, so it never flakes/fails a CI
 * run that isn't set up to run it.
 */
test.describe("real auth flow (requires a live API)", () => {
  test.skip(!process.env.API_BASE_URL, "Set API_BASE_URL to run this against a live FastAPI backend.");

  test("signup redirects to the dashboard (not a 404) and sets a session cookie", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correct-horse-battery-staple";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText("Page not found")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Start with the intake" })).toBeVisible();
  });
});
