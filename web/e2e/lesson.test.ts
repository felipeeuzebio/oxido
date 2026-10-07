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

test("inline code in a lesson is set in the mono face on its own background", async ({ page }) => {
  // The compiler emits <code translate="no"> for `let`; the lesson HTML can't
  // carry components, so the inline-code recipe is a rule on .lesson in app.css.
  await page.goto("/lesson/p01/02-variables");
  const code = page.locator(".lesson :not(pre) > code", { hasText: "let" }).first();
  await expect(code).toBeVisible();
  const styles = await code.evaluate((el) => {
    const own = getComputedStyle(el);
    return {
      font: own.fontFamily,
      background: own.backgroundColor,
      page: getComputedStyle(document.body).backgroundColor,
    };
  });
  expect(styles.font).toMatch(/mono/i);
  expect(styles.background).not.toBe(styles.page);
  expect(styles.background).not.toBe("rgba(0, 0, 0, 0)");
});

test("a link out of the course opens in a new tab, and says so to screen readers", async ({
  page,
}) => {
  await page.goto("/lesson/p01/01-hello");
  const link = page.getByRole("link", { name: "Rust Book (opens in a new tab)" });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  // The note is for screen readers only: sighted readers see "Rust Book".
  await expect(link.locator(".new-tab")).toHaveCSS("position", "absolute");
  await expect(link.locator(".new-tab")).toHaveCSS("width", "1px");
});

test("a link between lessons opens the other lesson at its heading", async ({ page }) => {
  await page.goto("/lesson/p01/01-hello");
  await page.getByRole("link", { name: "shadowing" }).click();
  await expect(page).toHaveURL(/\/lesson\/p01\/02-variables#shadowing$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Variables");
});
