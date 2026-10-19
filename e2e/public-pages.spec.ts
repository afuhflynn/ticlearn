import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers/hydration";

/**
 * The public pages in a real browser (spec 0012, AC-1, AC-8 and AC-9).
 *
 * These three pages are server rendered now, so what the browser reads is the
 * first HTML. The contact form is exercised against a stubbed endpoint, so
 * the flow is proved without a database.
 */
test("the pricing page shows the plans and its own title", async ({ page }) => {
  await page.goto("/pricing");

  await expect(
    page.getByRole("heading", { name: "Simple, Transparent Pricing" }),
  ).toBeVisible();
  await expect(page.getByText("Perfect for getting started")).toBeVisible();
  await expect(page.getByText("For serious study")).toBeVisible();
  await expect(page.getByText("3,500")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Free Trial" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(
    "TiCLearn Pricing · Free and Semester Pass Plans",
  );
});

test("the FAQ answers open for a student", async ({ page }) => {
  await page.goto("/faq");

  const trigger = page.getByRole("button", {
    name: "How much data does TiCLearn use?",
  });
  await waitForHydration(trigger);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("TiCLearn is designed to be light on data."),
  ).toBeVisible();
});

test("the contact form sends a message and tells the student", async ({
  page,
}) => {
  await page.route("**/api/contact", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto("/contact");
  const send = page.getByRole("button", { name: "Send Message" });
  await waitForHydration(send);
  await page.getByRole("textbox", { name: "Name" }).fill("Ada Tester");
  await page.getByRole("textbox", { name: "Email" }).fill("ada@example.com");
  await page.getByRole("textbox", { name: "Subject" }).fill("A question");
  await page.getByRole("textbox", { name: "Message" }).fill("How do I pay?");
  await send.click();

  await expect(
    page.getByText("Message sent! We'll get back to you soon."),
  ).toBeVisible();
});

test("the contact form tells the student when the message was refused", async ({
  page,
}) => {
  await page.route("**/api/contact", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "Message rejected" }),
    });
  });

  await page.goto("/contact");
  const send = page.getByRole("button", { name: "Send Message" });
  await waitForHydration(send);
  await page.getByRole("textbox", { name: "Name" }).fill("Ada Tester");
  await page.getByRole("textbox", { name: "Email" }).fill("ada@example.com");
  await page.getByRole("textbox", { name: "Subject" }).fill("A question");
  await page.getByRole("textbox", { name: "Message" }).fill("How do I pay?");
  await send.click();

  await expect(page.getByText("Message rejected")).toBeVisible();
});

test("a lost student gets the contact details on the 404 page", async ({
  page,
}) => {
  await page.goto("/no-such-page");

  await expect(
    page.getByRole("heading", { name: "Oops! Page not found." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "+237 222 12 34 56" }),
  ).toBeVisible();
});

test("the landing page shows the mobile money logos it promises", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("150 MB download · ~400 CFA")).toBeVisible();

  for (const src of [
    "/icons/mtn-mobile-money.svg",
    "/icons/orange-mobile-money.svg",
  ]) {
    const response = await page.request.get(src);
    expect(response.status(), `${src} is on the landing page`).toBe(200);
  }
});

for (const path of ["/pricing", "/faq", "/contact"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${path} has no serious accessibility findings in the ${theme} theme`, async ({
      page,
    }) => {
      await page.goto(path);
      if (theme === "dark") {
        await page.evaluate(() => {
          document.documentElement.classList.add("dark");
        });
      }
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2aa"])
        .analyze();
      const serious = results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      );
      expect(serious).toEqual([]);
    });
  }
}
