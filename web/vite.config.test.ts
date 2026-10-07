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
