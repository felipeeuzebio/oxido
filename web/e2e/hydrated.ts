import type { Page } from "@playwright/test";

/**
 * Opens a page and waits until React has hydrated it. Pages are pre-rendered,
 * so they show before their buttons and shortcuts work; a click that lands
 * earlier does nothing. React tags the nodes it has hydrated.
 */
export async function load(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(() => {
    const main = document.getElementById("main");
    return main !== null && Object.keys(main).some((key) => key.startsWith("__reactFiber"));
  });
}
