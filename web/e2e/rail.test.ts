import { expect, test } from "@playwright/test";

// One navigation shows at a time: the rail on wide screens, a tab bar along the
// bottom on phones (decision D30). The hidden one isn't in the accessibility tree.

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the rail marks the page you're on and takes you to a lesson", async ({ page }) => {
    await page.goto("/");
    const rail = page.getByRole("navigation", { name: "Main" });
    await expect(rail).toHaveCount(1);
    await expect(rail.getByRole("link", { name: "Roadmap" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rail.getByRole("button", { name: "Dark theme" })).toBeVisible();

    await rail.getByRole("link", { name: "Lesson" }).click();
    await expect(page).toHaveURL(/\/lesson\/p01\/01-hello$/);
    await expect(rail.getByRole("link", { name: "Lesson" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rail.getByRole("link", { name: "Roadmap" })).not.toHaveAttribute("aria-current");
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the items move to a tab bar along the bottom, the theme toggle to the top", async ({
    page,
  }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "Main" });
    await expect(tabs).toHaveCount(1);
    await expect(tabs.getByRole("link", { name: "Roadmap" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const box = await tabs.boundingBox();
    expect(box && Math.round(box.y + box.height)).toBe(844);

    const toggle = page.getByRole("button", { name: "Dark theme" });
    await expect(toggle).toHaveCount(1);
    expect((await toggle.boundingBox())?.y).toBeLessThan(100);
  });
});
