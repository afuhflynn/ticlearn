import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers/hydration";

/**
 * The public pages in a real browser (spec 0015, AC-5 and AC-6; spec 0014,
 * AC-1, AC-9 and AC-10 for the 404 page).
 *
 * These pages are server rendered, so what the browser reads is the first
 * HTML. The contact form is exercised against a stubbed endpoint, so the flow
 * is proved without a database.
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

test("a lost student gets a way back and a way to reach a human on the 404 page", async ({
  page,
}) => {
  await page.goto("/no-such-page");

  await expect(
    page.getByRole("heading", { name: "That page is not here." }),
  ).toBeVisible();
  await expect(
    page.getByText("The link may be old, or the page may have moved."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    page.getByRole("link", { name: "Start with one note" }),
  ).toHaveAttribute("href", "/sign-up");
  await expect(
    page.getByRole("link", { name: /Join the WhatsApp group/ }),
  ).toBeVisible();
  await expect(page.getByText(/\+237/)).toHaveCount(0);
});

test("the landing page keeps its sections, its anchors and its honesty", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Make your course notes make sense." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Free to start: \d+ notes, \d+ quizzes and \d+ messages to Tip a day\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Pay with MTN Mobile Money or Orange Money when you are ready. No card needed.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /See the plans/ }),
  ).toHaveAttribute("href", "/pricing");

  // No price, no percentage, no phone number anywhere on the page.
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/CFA/);
  expect(body).not.toMatch(/\d+\s*%/);
  expect(body).not.toMatch(/\+237/);

  // Every in-page anchor the nav promises has a real section.
  for (const id of ["how", "tools", "students", "faq", "free"]) {
    await expect(page.locator(`#${id}`), `#${id} must exist`).toHaveCount(1);
  }
});

test("the nav anchors land on their sections (spec 0015 AC-5)", async ({
  page,
}) => {
  await page.goto("/");

  const caseMap: Array<[string, string]> = [
    ["How it works", "#how"],
    ["Study tools", "#tools"],
    ["FAQ", "#faq"],
  ];
  for (const [label, hash] of caseMap) {
    await page.getByRole("link", { name: label }).first().click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
  }
});

test("the landing page does not scroll sideways on a small phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(overflow).toBeLessThanOrEqual(375);
});

for (const path of ["/", "/pricing", "/faq", "/contact"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${path} has no serious accessibility findings in the ${theme} theme`, async ({
      page,
    }) => {
      await page.goto(path);
      // The theme toggle paints over a few frames, and axe sampling a frame
      // mid transition reports a contrast the final state does not have. Kill
      // the transitions, apply the class, then wait for the painted result.
      await page.addStyleTag({
        content:
          "*, *::before, *::after { transition: none !important; animation: none !important; }",
      });
      if (theme === "dark") {
        await page.evaluate(() => {
          document.documentElement.classList.add("dark");
        });
      }
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
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
