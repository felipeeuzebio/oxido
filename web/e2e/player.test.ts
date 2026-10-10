import { expect, test } from "@playwright/test";
import { fakeYouTube } from "./fake-youtube";
import { load } from "./hydrated";

// The e2e build compiles the fixture course; its first lesson, "Hello, Cargo",
// plays the video helloVideo1. YouTube itself is faked (fake-youtube.ts).
const LESSON = "/lesson/p01/01-hello";

test("the video waits behind its thumbnail, and only the thumbnail comes from YouTube until play", async ({
  page,
}) => {
  const asked = await fakeYouTube(page);
  await load(page, LESSON);
  const play = page.getByRole("button", { name: "Play video: Hello, Cargo, from Let's Get Rusty" });
  await expect(play).toBeVisible();
  expect(asked).toEqual(["https://i.ytimg.com/vi/helloVideo1/hqdefault.jpg"]);

  await play.click();
  const frame = page.getByTitle("YouTube video player");
  await expect(frame).toHaveAttribute("data-video", "helloVideo1");
  expect(asked).toContain("https://www.youtube.com/iframe_api");
  await expect(play).toBeHidden();
});

test("the strip under the player follows the video", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText(/^00:0\d of 15:28$/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Position in the video" })).toHaveAttribute(
    "aria-valuetext",
    /^00:0\d of 15:28$/,
  );
});

test("nothing is drawn over YouTube's player", async ({ page }) => {
  await fakeYouTube(page);
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  const frame = page.getByTitle("YouTube video player");
  await expect(frame).toBeVisible();
  const box = await frame.boundingBox();
  if (!box) throw new Error("the player has no box");
  for (const [x, y] of [
    [0.5, 0.5],
    [0.1, 0.1],
    [0.9, 0.9],
  ]) {
    const on = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px, py)?.getAttribute("title"),
      [box.x + box.width * x, box.y + box.height * y],
    );
    expect(on).toBe("YouTube video player");
  }
});

test("when YouTube's player can't load, the video is offered on YouTube", async ({ page }) => {
  await fakeYouTube(page, { apiFails: true });
  await load(page, LESSON);
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.getByText("The video couldn't load here.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Watch it on YouTube/ })).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=helloVideo1",
  );
});
