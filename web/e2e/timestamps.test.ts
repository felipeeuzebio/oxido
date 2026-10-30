import { expect, type Page, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The fixture course's first video has three chapters, which its outline starts
// at 00:10, 01:30 and 02:40 in a 15:28 video, and its lesson has a hint to the
// second. YouTube is faked (fake-youtube.ts).
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

test("a hint plays the video from its moment", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("link", { name: "the demo, in the video from 01:30" }).click();
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

test("dragging along the strip scrubs across chapters and plays from where it's let go", async ({
  page,
}) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/^00:0\d of 15:28$/)).toBeVisible();

  const from = await chapter(page, "Hello, Cargo, 00:10").boundingBox();
  const to = await chapter(page, "Your first program, 02:40").boundingBox();
  if (!from || !to) throw new Error("no chapter boxes");
  const y = from.y + from.height / 2;
  await page.mouse.move(from.x + from.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, y, { steps: 8 });
  // While dragging, the tip names the chapter under the pointer, a handle
  // marks the spot, and the video hasn't moved yet.
  await expect(page.locator("[data-slot=chapter-tip]")).toContainText("Your first program");
  await expect(page.locator("[data-slot=handle]")).toBeVisible();
  await expect(page.getByText(/^00:\d\d of 15:28$/)).toBeVisible();
  await page.mouse.up();
  // The last chapter runs from 02:40 to 15:28; its middle is 09:04.
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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tapping the strip plays from the point tapped", async ({ page }) => {
    await fakeYouTube(page);
    await load(page, LESSON);
    const last = await chapter(page, "Your first program, 02:40").boundingBox();
    if (!last) throw new Error("no chapter box");
    await page.touchscreen.tap(last.x + last.width / 2, last.y + last.height / 2);
    await expect(page.getByTitle("YouTube video player")).toBeVisible();
    await expect(page.getByText(/^09:0\d of 15:28$/)).toBeVisible();
  });
});
