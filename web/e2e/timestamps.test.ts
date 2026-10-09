import { expect, type Page, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The fixture course's first lesson ends with a link to 0:42 in its video.
// YouTube is faked (fake-youtube.ts).
const LESSON = "/lesson/p01/01-hello";

const time = (page: Page) => page.getByRole("link", { name: "0:42 (plays the video from 0:42)" });

test("a time in the text starts the video from that moment", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await time(page).click();
  await expect(page.getByTitle("YouTube video player")).toBeVisible();
  await expect(page.getByText(/^00:4\d of 15:28$/)).toBeVisible();
  await expect(page).toHaveURL(/01-hello$/);
});

test("a time in the text moves a video that's playing", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/^00:0\d of 15:28$/)).toBeVisible();
  await time(page).click();
  await expect(page.getByText(/^00:4\d of 15:28$/)).toBeVisible();
});
