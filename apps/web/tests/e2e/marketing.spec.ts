import { test, expect } from "@playwright/test";

const PAGES: { path: string; heading: string | RegExp }[] = [
  { path: "/about", heading: "About" },
  { path: "/policy", heading: "Privacy Policy" },
  { path: "/terms", heading: "Terms of Use" },
  { path: "/faq", heading: "Frequently asked questions" },
];

for (const { path, heading } of PAGES) {
  test(`${path} returns 200 and renders its h1`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test.describe("/faq accordion", () => {
  test("renders the FAQ items", async ({ page }) => {
    await page.goto("/faq");

    // Presence-only check per spec — not testing expand/collapse interaction.
    await expect(
      page.getByRole("button", {
        name: "Is this a replacement for therapy or medication management?",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Can I export my data?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Is this HIPAA-compliant or run by a healthcare provider?",
      }),
    ).toBeVisible();
  });
});
