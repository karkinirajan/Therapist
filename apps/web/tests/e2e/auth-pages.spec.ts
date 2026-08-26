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
    // route), but it's wrapped in <Button asChild>, and Base UI's Button
    // primitive renders with `role="button"` even when the underlying
    // element is an anchor — hence `getByRole("button", ...)` here, not
    // "link", confirmed against the actual accessibility tree.
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });
});

test.describe("/signup", () => {
  test("renders the signup form", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: "Sign up", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    // The "Continue with Google" control is a real <a> (see the comment in
    // login/page.tsx: it needs a full browser navigation, not a client-side
    // route), but it's wrapped in <Button asChild>, and Base UI's Button
    // primitive renders with `role="button"` even when the underlying
    // element is an anchor — hence `getByRole("button", ...)` here, not
    // "link", confirmed against the actual accessibility tree.
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
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

  // BUG, verified against a real local FastAPI + Postgres instance while
  // writing this test (not fixed here, per instructions — signup/page.tsx
  // and login/page.tsx are existing route files): both call
  // `router.push("/dashboard")` on success, but there is no
  // `apps/web/app/dashboard/` route — the actual dashboard lives at `/`.
  // `/dashboard` IS one of proxy.ts's PROTECTED_PREFIXES, so the cookie
  // gate passes post-login (the browser lands on the URL, doesn't get
  // bounced to /login), but Next.js has no page there, so it renders
  // app/not-found.tsx ("Page not found") instead of the dashboard. Just
  // asserting the URL (as a first draft of this test did) doesn't catch
  // this — not-found still renders AT that URL — so this explicitly checks
  // for real dashboard content and the absence of the not-found copy.
  test("signup redirects to the dashboard (not a 404) and sets a session cookie", async ({
    page,
  }) => {
    // Marks this as a KNOWN, currently-failing test (Playwright's xfail
    // equivalent) rather than silently letting CI go red for a bug this
    // task was told to flag, not fix. If/when the redirect target is
    // corrected to "/", this assertion starts passing and Playwright will
    // report it as an *unexpected* pass, which is the signal to remove
    // this `test.fail()` call.
    test.fail(true, "BUG: post-signup/login redirect target '/dashboard' has no matching route (see comment below) — remove this test.fail() once fixed.");

    const email = `e2e-${Date.now()}@example.com`;
    const password = "correct-horse-battery-staple";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText("Page not found")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "CBT Recovery & Life-Systems Coach" }),
    ).toBeVisible();
  });
});
