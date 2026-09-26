import { expect, test } from "@playwright/test";
import { E2E_TOKEN } from "../playwright.config";

// The launch link works once per `oxido` run, so the whole session flow is one
// test. It's the only test that uses the link.
test("the launch link opens a session once, then progress can be saved", async ({
  page,
  browser,
}) => {
  await page.goto(`/?token=${E2E_TOKEN}`);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Oxidō" })).toBeVisible();

  const progress = await page.evaluate(async () => {
    const put = await fetch("/api/classes/3.4/text", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    if (put.status !== 204) throw new Error(`PUT failed: ${put.status}`);
    return (await fetch("/api/progress")).json();
  });
  expect(progress.classes["3.4"].text_read).toBe(true);

  // Someone else opening the same link later (from history, say) gets nothing.
  const other = await browser.newPage();
  await other.goto(`/?token=${E2E_TOKEN}`);
  const status = await other.evaluate(async () => (await fetch("/api/progress")).status);
  expect(status).toBe(401);
  await other.close();
});

test("without the launch link, the page loads but progress stays locked", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Oxidō" })).toBeVisible();

  const status = await page.evaluate(async () => (await fetch("/api/progress")).status);
  expect(status).toBe(401);
});
