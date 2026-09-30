import { defineConfig } from "vitest/config";

// The repository's own tests, in tests/: rules for the tooling and CI setup
// (commit rules, workflows, hooks, agent skills) and the scripts that agent
// skills bundle.
// The frontend's tests run in web/.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
