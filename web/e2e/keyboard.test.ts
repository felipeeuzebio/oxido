import { expect, type Page, test } from "@playwright/test";

// The e2e build compiles the content compiler's fixture course, whose first
// phase has two lessons: "Hello, Cargo" and "Variables".

const palette = (page: Page) => page.getByRole("dialog", { name: "Search the course" });

// The shortcut and the focus moves are React's, so they start working once the
// pre-rendered page is hydrated. React tags the nodes it has hydrated.
async function load(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(() => {
    const main = document.getElementById("main");
    return main !== null && Object.keys(main).some((key) => key.startsWith("__reactFiber"));
  });
}

// The listener goes on in an effect just after hydration, so a press can still
// land a moment too early; press again until the palette shows.
async function openWith(page: Page, keys: string) {
  await expect(async () => {
    await page.keyboard.press(keys);
    await expect(palette(page)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 10_000 });
}

test.describe("the command palette", () => {
  test("Ctrl+K opens it, and a lesson found by name opens with focus on its heading", async ({
    page,
  }) => {
    await load(page);
    await openWith(page, "Control+k");
    await page.keyboard.type("variab");
    await expect(palette(page).getByRole("option")).toHaveText([/^Variables/]);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/lesson\/p01\/02-variables$/);
    await expect(palette(page)).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });

  test("puts the best match first and selects it, whatever its group", async ({ page }) => {
    await load(page);
    await openWith(page, "Control+k");
    await page.keyboard.type("hel");
    const best = palette(page).getByRole("option").first();
    await expect(best).toHaveText("Hello, CargoPhase 1: First Steps");
    await expect(best).toHaveAttribute("aria-selected", "true");
  });

  test("starts empty each time it opens", async ({ page }) => {
    await load(page);
    await openWith(page, "Control+k");
    await page.keyboard.type("hel");
    await page.keyboard.press("Escape");
    await openWith(page, "Control+k");
    await expect(palette(page).getByRole("combobox")).toHaveValue("");
  });

  test("⌘K opens it too, and Escape closes it", async ({ page }) => {
    await load(page);
    await openWith(page, "Meta+k");
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
  });

  test("switches the theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await load(page);
    await openWith(page, "Control+k");
    await page.keyboard.type("dark");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  test.describe("on a wide screen", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("the Search button at the rail's foot opens it", async ({ page }) => {
      await load(page);
      const search = page.getByRole("navigation", { name: "Main" }).getByRole("button", {
        name: "Search",
      });
      await expect(search).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
      await search.click();
      await expect(palette(page)).toBeVisible();
    });
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the Search button in the top bar opens it", async ({ page }) => {
      await load(page);
      await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
      await expect(palette(page)).toBeVisible();
    });
  });
});

test.describe("moving around by keyboard", () => {
  test("the first Tab reaches a link that skips to the page's content", async ({ page }) => {
    await load(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("after following a link, focus lands on the new page's heading", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await load(page);
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Lesson" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, Cargo");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });
});
