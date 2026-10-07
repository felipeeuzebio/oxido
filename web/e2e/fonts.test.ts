import { expect, test } from "@playwright/test";

// The three typefaces design.md names are self-hosted: a lesson renders in
// them, and every font comes from the page's own server, never from Google.
test("a lesson renders in the self-hosted fonts, served by the page's own server", async ({
  page,
}) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await page.goto("/lesson/p01/01-hello", { waitUntil: "networkidle" });
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === "loaded")
      .map((face) => `${face.family.replaceAll('"', "")} ${face.weight}`);
  });

  // Body text, the bold lesson title, and its code.
  expect(loaded).toEqual(
    expect.arrayContaining([
      "Zen Kaku Gothic New 400",
      "Shippori Mincho B1 700",
      "JetBrains Mono 400",
    ]),
  );
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.filter((url) => new URL(url).origin !== new URL(page.url()).origin)).toEqual([]);
});
