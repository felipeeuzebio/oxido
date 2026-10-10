import { expect, test } from "@playwright/test";
import { load } from "./hydrated";

const html = (page: import("@playwright/test").Page) => page.locator("html");
const toggle = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Dark theme" });

test("follows the operating system until the student presses the toggle", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await load(page);
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
});

test("the toggle switches to the other theme and keeps it across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await load(page);
  await toggle(page).click();
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
});

test("an explicit choice no longer follows the operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await load(page);
  await toggle(page).click();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);
});
