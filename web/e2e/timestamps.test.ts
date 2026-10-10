import { expect, type Page, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The fixture course's first lesson has three parts, which its outline starts
// at 00:10, 01:30 and 02:40 in a 15:28 video. YouTube is faked (fake-youtube.ts).
const LESSON = "/lesson/p01/01-hello";

const chapter = (page: Page, name: string) =>
  page.getByRole("button", { name: `Chapter: ${name}` });

test("the strip shows the video's length and its chapters before play", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await expect(page.getByText("00:00 of 15:28")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Chapter: / })).toHaveCount(3);
});

test("a chapter's name shows on hover", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await chapter(page, "Your first program, 02:40").hover();
  await expect(page.getByRole("tooltip")).toHaveText("Your first program · 02:40");
});

test("a chapter's name shows on keyboard focus", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await chapter(page, "Hello, Cargo, 00:10").focus();
  await expect(page.getByRole("tooltip")).toHaveText("Hello, Cargo · 00:10");
});

test("a section's time plays the video from there", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page
    .getByRole("link", { name: "Watch “Your first program” in the video, from 01:30" })
    .click();
  await expect(page.getByTitle("YouTube video player")).toBeVisible();
  await expect(page.getByText(/^01:3\d of 15:28$/)).toBeVisible();
  await expect(page).toHaveURL(/01-hello$/);
});

test("a chapter on the strip moves a playing video there", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/^00:0\d of 15:28$/)).toBeVisible();
  await chapter(page, "Your first program, 02:40").click();
  await expect(page.getByText(/^02:4\d of 15:28$/)).toBeVisible();
});
