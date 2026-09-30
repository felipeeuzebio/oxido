// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import { beforeAll, describe, expect, it } from "vitest";

// The commit rules are checked on every commit (lefthook) and on every PR title
// (CI), so a rule that rejects our own automation blocks work. These tests keep
// commitlint.config.js, docs/conventions.md and the bots' title formats in step.

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

type Loaded = Awaited<ReturnType<typeof load>>;
let config: Loaded;

beforeAll(async () => {
  config = await load({}, { cwd: process.cwd() });
});

async function accepts(message: string): Promise<boolean> {
  type Options = NonNullable<Parameters<typeof lint>[2]>;
  const parserOpts = config.parserPreset?.parserOpts as Options["parserOpts"];
  const result = await lint(message, config.rules, parserOpts ? { parserOpts } : {});
  return result.valid;
}

function scopesInConfig(): string[] {
  const rule = config.rules["scope-enum"] as [number, string, string[]];
  return [...rule[2]].sort();
}

function scopesInDocs(): string[] {
  const doc = read("docs/conventions.md");
  const table = doc.slice(doc.indexOf("The scope is optional"), doc.indexOf("Examples:"));
  return [...table.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((match) => match[1]).sort();
}

describe("commit rules", () => {
  it("allow exactly the scopes listed in docs/conventions.md", () => {
    expect(scopesInDocs().length).toBeGreaterThan(0);
    expect(scopesInConfig()).toEqual(scopesInDocs());
  });

  it("accept every example in docs/conventions.md", async () => {
    const doc = read("docs/conventions.md");
    const block = doc.slice(doc.indexOf("Examples:"));
    const examples = block.slice(
      block.indexOf("```") + 3,
      block.indexOf("```", block.indexOf("```") + 3),
    );
    const lines = examples.split("\n").filter((line) => line.trim() !== "");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(await accepts(line), line).toBe(true);
  });

  it("accept release-please's release PR title", async () => {
    const releasePlease = JSON.parse(read("release-please-config.json"));
    const pattern: string = releasePlease["pull-request-title-pattern"];
    expect(pattern, "set pull-request-title-pattern; the default scope is `main`").toBeTruthy();
    const title = pattern
      .replace(/\$\{version\}/, "0.2.0")
      .replace(/\$\{component\}/, "")
      .replace(/\$\{branch\}/, "main");
    expect(await accepts(title), title).toBe(true);
  });

  it("accept the titles of the PRs that carry a release between develop and main", async () => {
    // docs/release.md: the title check is required on both branches.
    for (const title of [
      "chore(release): merge develop into main",
      "chore(release): merge main into develop",
    ]) {
      expect(await accepts(title), title).toBe(true);
    }
  });

  it("accept Dependabot's update titles, for every ecosystem", async () => {
    const blocks = read(".github/dependabot.yml").split("- package-ecosystem:").slice(1);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const prefix = block.match(/^\s+prefix:\s*(\S+)\s*$/m)?.[1];
      expect(prefix, "every ecosystem sets commit-message.prefix").toBeTruthy();
      // With `include: scope`, Dependabot adds "(deps)" or, for development
      // dependencies, "(deps-dev)". Without it, it adds ": " after the prefix.
      const heads = /^\s+include:\s*scope\s*$/m.test(block)
        ? [`${prefix}(deps)`, `${prefix}(deps-dev)`]
        : [`${prefix}`];
      for (const head of heads) {
        const title = `${head}: bump vite from 8.0.1 to 8.0.2`;
        expect(await accepts(title), title).toBe(true);
      }
    }
  });

  it("reject the bots' default scopes and other unknown ones", async () => {
    expect(await accepts("chore(main): release 0.2.0")).toBe(false);
    expect(await accepts("chore(deps-dev): bump vite from 8.0.1 to 8.0.2")).toBe(false);
    expect(await accepts("feat(tauri): add a window")).toBe(false);
  });
});
