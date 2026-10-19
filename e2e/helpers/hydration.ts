import { expect, type Locator } from "@playwright/test";

/**
 * Wait for a client island to be hydrated.
 *
 * These pages are server rendered, so the browser can paint them before the
 * client bundle has run. A click that lands before React has attached its
 * handlers is lost, and the test would blame the page for a race it caused
 * itself. React marks the nodes it has hydrated, so that is what we wait for.
 */
export async function waitForHydration(locator: Locator) {
  await expect(async () => {
    const hydrated = await locator.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
    );
    expect(hydrated).toBe(true);
  }).toPass({ timeout: 15000 });
}
