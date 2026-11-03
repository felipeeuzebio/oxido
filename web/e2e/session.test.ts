import { type APIRequestContext, type BrowserContext, expect, test } from "@playwright/test";
import { contract } from "../app/features/storage/contract";
import { createOxidoStorage, type Http } from "../app/features/storage/oxido";
import { E2E_TOKEN } from "../playwright.config";
import { load } from "./hydrated";

/** oxido's API through a context's own cookies, as its page would call it. */
const http = (request: APIRequestContext, origin: string): Http => ({
  async send(method, path, body) {
    const response = await request.fetch(path, { method, data: body, headers: { origin } });
    return { status: response.status(), json: () => response.json() };
  },
});

// The launch link works once per `oxido` run, so one session serves the whole
// file, in order. It's the only file that uses the link.
test.describe("a session", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("the launch link opens a session once, then progress can be saved", async ({ browser }) => {
    const page = await context.newPage();
    await page.goto(`/?token=${E2E_TOKEN}`);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const progress = await page.evaluate(async () => {
      const put = await fetch("/api/classes/3.4/video", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seconds: 391 }),
      });
      if (put.status !== 204) throw new Error(`PUT failed: ${put.status}`);
      return (await fetch("/api/progress")).json();
    });
    expect(progress.classes["3.4"].videoSeconds).toBe(391);

    // Someone else opening the same link later (from history, say) gets nothing.
    const other = await browser.newPage();
    await other.goto(`/?token=${E2E_TOKEN}`);
    const status = await other.evaluate(async () => (await fetch("/api/progress")).status);
    expect(status).toBe(401);
    await other.close();
  });

  // The storage contract (app/features/storage/contract.ts), against oxido.
  for (const { name, run } of contract) {
    test(`oxido's storage ${name}`, async ({ baseURL }) => {
      await run(createOxidoStorage(http(context.request, baseURL ?? "")));
    });
  }

  test("the roadmap's Continue card opens the class the student was last in", async ({
    baseURL,
  }) => {
    const origin = baseURL ?? "";
    const saved = await context.request.fetch("/api/classes/02-variables/video", {
      method: "PUT",
      data: { seconds: 20 },
      headers: { origin },
    });
    expect(saved.status()).toBe(204);
    const page = await context.newPage();
    await load(page, "/");
    await expect(page.getByRole("link", { name: "Open the lesson" })).toHaveAttribute(
      "href",
      "/lesson/p01/02-variables",
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.close();
  });
});

test("without the launch link, the page loads but progress stays locked", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const status = await page.evaluate(async () => (await fetch("/api/progress")).status);
  expect(status).toBe(401);
  // The page says why nothing is saved, and how to fix it.
  await expect(page.getByRole("alert")).toContainText(
    "Open the link oxido printed in your terminal.",
  );
});
