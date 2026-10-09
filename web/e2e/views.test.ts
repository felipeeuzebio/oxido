import { expect, type Page, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The fixture course's first lesson; YouTube is faked (fake-youtube.ts).
const LESSON = "/lesson/p01/01-hello";

const text = (page: Page) => page.getByRole("article", { name: "Text lesson" });
const view = (page: Page, name: string) => page.getByRole("radio", { name });

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Both puts the video beside the text", async ({ page }) => {
    await fakeYouTube(page);
    await load(page, LESSON);
    await expect(view(page, "Both")).toHaveAttribute("aria-checked", "true");
    const video = await page.getByRole("button", { name: /Play video/ }).boundingBox();
    const lesson = await text(page).boundingBox();
    if (!video || !lesson) throw new Error("missing a box");
    expect(video.x + video.width).toBeLessThanOrEqual(lesson.x);
    expect(Math.abs(video.y - lesson.y)).toBeLessThan(40);
  });

  test("the view picked is kept across pages", async ({ page }) => {
    await fakeYouTube(page);
    await load(page, LESSON);
    await view(page, "Text").click();
    await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(0);
    await expect(text(page)).toBeVisible();

    await load(page, LESSON);
    await expect(view(page, "Text")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(0);

    await view(page, "Video").click();
    await expect(text(page)).toBeHidden();
    await expect(page.getByRole("button", { name: /Play video/ })).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a playing video stays pinned to the top while the text scrolls under it", async ({
    page,
  }) => {
    await fakeYouTube(page);
    await load(page, LESSON);
    await page.getByRole("button", { name: /Play video/ }).click();
    const player = page.getByTitle("YouTube video player");
    await expect(player).toBeVisible();

    // Pinned: at the top, under a small band, and staying there as the page moves.
    const pinned = async () => {
      const box = await player.boundingBox();
      expect(box?.y).toBeLessThanOrEqual(8);
      expect(box?.height).toBeGreaterThanOrEqual(200);
    };
    await page.mouse.wheel(0, 600);
    await expect(pinned).toPass();
    await page.mouse.wheel(0, 300);
    await expect(pinned).toPass();
  });
});
