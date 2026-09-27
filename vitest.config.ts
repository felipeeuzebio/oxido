import { defineConfig } from "vitest/config";

// Repository rules: tests at the root that check the tooling and CI setup
// (commit rules, workflows, hooks). The frontend's tests run in web/.
export default defineConfig({
  test: {
    include: ["*.test.ts"],
    environment: "node",
  },
});
