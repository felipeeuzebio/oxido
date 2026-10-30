import { expect, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The fixture course's first lesson, whose task is the white belt's stripes 1
// and 2; YouTube is faked (fake-youtube.ts).
const LESSON = "/lesson/p01/01-hello";

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the video sits beside the task", async ({ page }) => {
    await fakeYouTube(page);
    await load(page, LESSON);
    const video = await page.getByRole("button", { name: /Play video/ }).boundingBox();
    const task = await page
      .getByRole("region", { name: "White belt, stripes 1 and 2" })
      .boundingBox();
    if (!video || !task) throw new Error("missing a box");
    expect(video.x + video.width).toBeLessThanOrEqual(task.x);
    expect(Math.abs(video.y - task.y)).toBeLessThan(40);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a playing video stays pinned to the top while the task scrolls under it", async ({
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
