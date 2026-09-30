import { expect, test } from "@playwright/test";

// The e2e build compiles the content compiler's fixture course
// (OXIDO_CONTENT in playwright.config.ts), so these lessons always exist.

test("a lesson is pre-rendered from the compiled content", async ({ page, request }) => {
  const response = await request.get("/lesson/p01/01-hello");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<h1");

  await page.goto("/lesson/p01/01-hello");
  await expect(page).toHaveTitle("Hello, Cargo · Oxidō");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, Cargo");
});

test("lesson code is highlighted in the code colors", async ({ page }) => {
  await page.goto("/lesson/p01/01-hello");
  const keyword = page.locator("pre.code a-kc").first();
  await expect(keyword).toHaveText("if");
  // The color --code-control resolves to, measured on a probe in the same block.
  const control = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--code-control)";
    document.querySelector("pre.code")?.append(probe);
    return getComputedStyle(probe).color;
  });
  expect(await keyword.evaluate((el) => getComputedStyle(el).color)).toBe(control);
});

test("a link between lessons opens the other lesson at its heading", async ({ page }) => {
  await page.goto("/lesson/p01/01-hello");
  await page.getByRole("link", { name: "shadowing" }).click();
  await expect(page).toHaveURL(/\/lesson\/p01\/02-variables#shadowing$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Variables");
});
