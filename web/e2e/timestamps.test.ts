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

const tip = (page: Page) => page.locator("[data-slot=chapter-tip]");

test("hovering a chapter thickens it and names it, with the moment under the pointer", async ({
  page,
}) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  const segment = chapter(page, "Your first program, 01:30");
  const track = segment.locator("span").first();
  const before = await track.boundingBox();
  await segment.hover();
  await expect(tip(page)).toContainText("Your first program");
  await expect(async () => {
    const after = await track.boundingBox();
    expect(after?.height).toBeGreaterThan((before?.height ?? 0) * 1.5);
  }).toPass();
});

test("a chapter with keyboard focus shows its name and start", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await chapter(page, "Hello, Cargo, 00:10").focus();
  await expect(tip(page)).toHaveText("Hello, Cargo00:10");
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

test("clicking the strip plays from the point clicked", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/^00:0\d of 15:28$/)).toBeVisible();
  // The last chapter runs from 02:40 to the end at 15:28; its middle is 09:04.
  await chapter(page, "Your first program, 02:40").click();
  await expect(page.getByText(/^09:0\d of 15:28$/)).toBeVisible();
});

test("Enter on a chapter plays it from its start", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await chapter(page, "Your first program, 02:40").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTitle("YouTube video player")).toBeVisible();
  await expect(page.getByText(/^02:4\d of 15:28$/)).toBeVisible();
});
