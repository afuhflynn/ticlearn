import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers/hydration";

/**
 * The subscribe flow on the pricing page, in a real browser (spec 0012, AC-8).
 *
 * The session, the current plan and the payment call are stubbed at the
 * network edge, so the flow is proved without an account and without a
 * payment provider. What is under test is the island: it reads the session,
 * it starts the payment, and it sends the student to the checkout.
 */
const SESSION = {
  session: {
    id: "session-1",
    userId: "user-1",
    token: "test-token",
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ipAddress: "127.0.0.1",
    userAgent: "playwright",
  },
  user: {
    id: "user-1",
    name: "Ada Tester",
    email: "ada@example.com",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

test("a signed out visitor is sent to the sign in page from the pricing page", async ({
  page,
}) => {
  await page.goto("/pricing");
  const subscribe = page.getByRole("button", { name: "Start Free Trial" });
  await waitForHydration(subscribe);
  await subscribe.click();

  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=\/pricing/);
});

test("a signed in student reaches the checkout after subscribing", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION),
    });
  });
  await page.route("**/api/subscription/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ subscription: null, previousPlan: null }),
    });
  });
  await page.route("**/api/payment/initiate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ link: "http://localhost:3000/checkout-stub" }),
    });
  });
  await page.route("**/checkout-stub", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>checkout</h1></body></html>",
    });
  });

  await page.goto("/pricing");
  const subscribe = page.getByRole("button", { name: "Start Free Trial" });
  await waitForHydration(subscribe);
  await subscribe.click();

  await expect(page).toHaveURL(/checkout-stub/);
  await expect(page.getByRole("heading", { name: "checkout" })).toBeVisible();
});

test("a student who already has the plan is offered nothing to press", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION),
    });
  });
  await page.route("**/api/subscription/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscription: { plan: "PRO", status: "ACTIVE" },
        previousPlan: null,
      }),
    });
  });

  await page.goto("/pricing");

  await expect(
    page.getByRole("button", { name: "Current Plan" }),
  ).toBeDisabled();
});
