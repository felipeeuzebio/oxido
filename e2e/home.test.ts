import { expect, test } from "@playwright/test";

test("the home page loads and names the course", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Oxidō");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oxidō");
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
