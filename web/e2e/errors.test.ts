import { expect, test } from "@playwright/test";

// The production build, served by oxido: unknown paths get the SPA fallback,
// and the app's root error boundary takes over.

test("an unknown page shows the panicking crab and a 404 that reads like rustc", async ({
  page,
}) => {
  await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page).toHaveTitle("Page not found · Oxidō");
  await expect(page.getByRole("img", { name: "Ferris the crab, panicking" })).toBeVisible();
  const details = page.getByLabel("Error details");
  await expect(details).toContainText("error[404]: no page at this address");
  await expect(details).toContainText("--> /no/such/page");
  await expect(page.getByText("Backtrace (only in development)")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Go to the roadmap" })).toHaveAttribute("href", "/");
});

test("a lesson that isn't written is a 404 too, not a crash", async ({ page }) => {
  await page.goto("/lesson/p01/99-nope");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByLabel("Error details")).toContainText(
    "help: lessons live at /lesson/<phase>/<slug>",
  );
});
