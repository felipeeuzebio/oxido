// @vitest-environment node
//
// CI and git hook settings that must stay in step with the rest of the repo.
// (Commit message rules have their own test: commitlint.config.test.ts.)
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const workflows = readdirSync(".github/workflows")
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ name, text: read(`.github/workflows/${name}`) }));

describe("GitHub workflows", () => {
  it("pin every action to a commit, with its version in a comment", () => {
    // A tag like @v4 can be moved to different code at any time, so a
    // compromised action would run in our CI with our secrets. A commit SHA
    // can't change. Dependabot updates the SHA and the comment together.
    const unpinned: string[] = [];
    let actions = 0;
    for (const { name, text } of workflows) {
      for (const [, uses] of text.matchAll(/^\s*(?:-\s+)?uses:\s*(.+?)\s*$/gm)) {
        if (uses.startsWith("./") || uses.startsWith("docker://")) continue;
        actions += 1;
        if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # \S+$/.test(uses)) unpinned.push(`${name}: ${uses}`);
      }
    }
    expect(actions).toBeGreaterThan(0);
    expect(unpinned).toEqual([]);
  });

  it("are kept up to date by Dependabot", () => {
    expect(read(".github/dependabot.yml")).toMatch(/package-ecosystem:\s*github-actions/);
  });
});
