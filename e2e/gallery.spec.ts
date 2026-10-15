import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("gallery renders in light theme with no serious axe findings", async ({
  page,
}) => {
  await page.goto("/primitive-gallery?theme=light");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});

test("gallery renders in dark theme with no serious axe findings", async ({
  page,
}) => {
  await page.goto("/primitive-gallery?theme=dark");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});
