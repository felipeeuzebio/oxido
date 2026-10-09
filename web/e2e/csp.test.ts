import { expect, type Page, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// Every page carries a content security policy (web/csp.ts). These tests
// collect whatever the browser blocks, before the page's own scripts run.
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const blocked: string[] = [];
    Object.assign(window, { blocked });
    document.addEventListener("securitypolicyviolation", (event) => {
      blocked.push(`${event.effectiveDirective} ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { blocked: string[] }).blocked);
}

test("the pages carry a policy, and nothing they do breaks it", async ({ page }) => {
  const blocked = await watchViolations(page);
  await fakeYouTube(page);

  await load(page, "/");
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Search" }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog", { name: "Search the course" })).toBeVisible();
  await page.keyboard.press("Escape");

  await load(page, "/lesson/p01/01-hello");
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/of 15:28/)).toBeVisible();
  await page.getByRole("link", { name: "shadowing" }).click();
  await expect(page).toHaveURL(/02-variables#shadowing$/);

  expect(await blocked()).toEqual([]);
});

test("a script the page didn't ship is blocked", async ({ page }) => {
  const blocked = await watchViolations(page);
  await load(page, "/");
  const ran = await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.injected = true;";
    document.body.append(script);
    return "injected" in window;
  });
  expect(ran).toBe(false);
  await expect.poll(blocked).toContainEqual(expect.stringMatching(/^script-src-elem inline$/));
});
