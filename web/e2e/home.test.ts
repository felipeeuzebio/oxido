import { expect, type Page, test } from "@playwright/test";

// The e2e build compiles the content compiler's fixture course: a kickoff, the
// white belt (p01, two stripes, two lessons) and the yellow belt (p02, one stripe).
const ROADMAP = "From white belt to yellow belt";

test("the home page shows the roadmap of the compiled course", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Oxidō");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ROADMAP);
  await expect(
    page.getByRole("region", { name: "Phases" }).getByRole("heading", { level: 3 }),
  ).toHaveText(["Kickoff", "First Steps", "Ownership"]);
});

test("the Continue card opens a lesson, and back returns to the roadmap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open the lesson" }).click();
  await expect(page).toHaveURL(/\/lesson\/p01\/01-hello$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, Cargo");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ROADMAP);
});

async function strips(page: Page) {
  const boxes = await page
    .getByRole("region", { name: "Belts" })
    .locator("[data-slot=strip]")
    .evaluateAll((all) => all.map((strip) => strip.getBoundingClientRect().toJSON() as DOMRect));
  expect(boxes).toHaveLength(2);
  return boxes;
}

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the belts run across in one strip, each as wide as its stripes", async ({ page }) => {
    await page.goto("/");
    const [white, yellow] = await strips(page);
    expect(yellow.y).toBeCloseTo(white.y, 0);
    expect(yellow.x).toBeCloseTo(white.x + white.width - 1, 0);
    expect(white.width / yellow.width).toBeCloseTo(2, 1);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the belt stands up, read top down, and nothing scrolls sideways", async ({ page }) => {
    await page.goto("/");
    const [white, yellow] = await strips(page);
    expect(yellow.x).toBeCloseTo(white.x, 0);
    expect(yellow.y).toBeCloseTo(white.y + white.height - 1, 0);
    expect(white.height).toBeGreaterThan(white.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test("oxido serves the logo and the tab icons", async ({ page, request }) => {
  await page.goto("/");
  const logo = page.getByRole("link", { name: "Oxidō" }).getByRole("img", { name: "Oxidō" });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );

  const files: Array<[string, string]> = [
    ["favicon.svg", "image/svg+xml"],
    ["favicon.png", "image/png"],
    ["apple-touch-icon.png", "image/png"],
  ];
  for (const [file, type] of files) {
    const response = await request.get(`/${file}`);
    expect(response.status(), file).toBe(200);
    expect(response.headers()["content-type"], file).toBe(type);
  }
});
