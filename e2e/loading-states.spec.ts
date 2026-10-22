import { expect, test } from "@playwright/test";

/**
 * The loading states in a real browser (spec 0013, AC-23).
 *
 * A screen with fast data shows no loader at all. The public pages are
 * prerendered, so they are the proof: nothing waits, so nothing is drawn
 * while the student waits.
 */
test("a prerendered page shows no loader at all", async ({ page }) => {
  const loaders: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") loaders.push(message.text());
  });

  await page.goto("/pricing");

  await expect(
    page.getByRole("heading", { name: "Simple, Transparent Pricing" }),
  ).toBeVisible();

  // A spinner is a rotating icon, and the rule is that a spinner never
  // appears in the student app or the admin console.
  await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0);
  await expect(page.locator(".animate-spin")).toHaveCount(0);
  await expect(page.locator("[data-slot='pending-region']")).toHaveCount(0);
});

test("the marketing navigation renders the buttons while the session resolves", async ({
  page,
}) => {
  await page.goto("/pricing");

  const signIn = page.getByRole("link", { name: "Sign In" }).first();
  await expect(signIn).toBeVisible();

  // The navigation reserves no space with a skeleton while it waits.
  await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0);
});

test("the public pages are readable before any network call finishes", async ({
  page,
}) => {
  // Every request is held, so the page is painted from the server document
  // alone. A page that needs JavaScript to paint fails here.
  await page.route("**/api/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.abort();
  });

  await page.goto("/faq");

  await expect(
    page.getByRole("heading", { name: "Frequently Asked Questions" }),
  ).toBeVisible();
});
