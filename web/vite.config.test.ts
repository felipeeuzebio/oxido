// @vitest-environment node
//
// Vite's native config loader, planned to become the default, runs this config
// in Node without bundling it first, so every relative import it reaches must
// name its file (`./content.server.ts`, not `./content.server`).
import { loadConfigFromFile } from "vite";
import { expect, it } from "vitest";

it("loads with Vite's native config loader", async () => {
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    undefined,
    import.meta.dirname,
    "silent",
    undefined,
    "native",
  );
  expect(loaded?.path).toMatch(/vite\.config\.ts$/);
}, 30_000);

it("never inlines a font into the CSS, so each one downloads only when a page needs it", async () => {
  // Vite inlines small assets as data: URLs by default. For fonts that puts
  // every small subset into the render-blocking stylesheet, used or not.
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "production" },
    undefined,
    import.meta.dirname,
    "silent",
  );
  const limit = loaded?.config.build?.assetsInlineLimit;
  expect(typeof limit).toBe("function");
  if (typeof limit !== "function") return;
  const tiny = Buffer.alloc(100);
  expect(limit("fonts/zen-kaku-gothic-new-latin-ext-400-normal.woff2", tiny)).toBe(false);
  expect(limit("fonts/zen-kaku-gothic-new-latin-ext-400-normal.woff", tiny)).toBe(false);
  expect(limit("public/favicon.svg", tiny)).toBeUndefined();
}, 30_000);
