import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real app: the `oxido` server (a debug build, which
// reads the UI from web/build/client) serving the production frontend build.
// The throwaway course project lives in the workspace's target/ folder.
export const E2E_TOKEN = "e2e-token-0123456789abcdef";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    // Optional: point at an already-installed Chromium instead of `playwright install`.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "bun run build && rm -rf ../target/e2e-project && mkdir -p ../target/e2e-project && " +
      "echo 'course = \"minisql\"' > ../target/e2e-project/oxido.toml && " +
      "cargo run --quiet -p oxido -- serve --port 4173 --no-open --project ../target/e2e-project",
    url: "http://127.0.0.1:4173/api/health",
    env: { OXIDO_TOKEN: E2E_TOKEN },
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
