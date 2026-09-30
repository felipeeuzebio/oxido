// @vitest-environment node
//
// CI and git hook settings that must stay in step with the rest of the repo.
// (Commit message rules have their own test: commitlint.config.test.ts.)
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const list = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);

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

  // Work lands on develop, the default branch; main holds what has been
  // released (docs/conventions.md, decision D27).
  it("run CI on pushes to both long-lived branches", () => {
    expect(read(".github/workflows/ci.yml")).toMatch(/push:\n\s+branches: \[develop, main\]/);
  });

  it("release from develop and deploy the website from main", () => {
    // release-please follows the default branch unless it's named, so a change
    // of default branch would otherwise move the releases with it.
    const release = read(".github/workflows/release.yml");
    expect(release).toMatch(/push:\n\s+branches: \[develop\]/);
    expect(release).toMatch(/^\s+target-branch: develop$/m);
    expect(read(".github/workflows/pages.yml")).toMatch(/push:\n\s+branches: \[main\]/);
  });
});

describe("git hooks", () => {
  it("format only the staged Rust files, in the workspace's edition", () => {
    // rustfmt called directly doesn't read Cargo.toml, so the hook names the
    // edition. If it drifted, the hook and CI's `cargo fmt --check` would
    // disagree about the same file.
    const edition = read("Cargo.toml").match(/^edition = "(\d+)"$/m)?.[1];
    expect(edition, "Cargo.toml sets [workspace.package] edition").toBeTruthy();
    const hook = read("lefthook.yml").match(/^ {4}rustfmt:\n((?: {6}.*\n)+)/m)?.[1] ?? "";
    expect(hook).toMatch(new RegExp(`run: rustfmt --edition ${edition} \\{staged_files\\}$`, "m"));
    expect(hook).toMatch(/stage_fixed: true/);
  });
});

describe("agent instructions", () => {
  it("are CLAUDE.md for every agent", () => {
    // Codex, Cursor and VS Code read AGENTS.md, so it's a symlink to CLAUDE.md
    // rather than a second copy. Gemini CLI reads it only when told to.
    expect(lstatSync("AGENTS.md").isSymbolicLink()).toBe(true);
    expect(realpathSync("AGENTS.md")).toBe(realpathSync("CLAUDE.md"));
    const gemini = JSON.parse(read(".gemini/settings.json"));
    expect(gemini.context.fileName).toContain("AGENTS.md");
  });
});

describe("agent skills", () => {
  // Skills live once, in .agents/skills/, which Codex, Gemini CLI, Cursor and
  // VS Code read. Claude Code only reads .claude/skills/, so each skill there
  // is a symlink to the same folder instead of a copy that could drift.
  const skills = list(".agents/skills");

  it("follow the Agent Skills format, so every agent can load them", () => {
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      const frontMatter = read(`.agents/skills/${skill}/SKILL.md`).match(/^---\n([\s\S]*?)\n---\n/);
      expect(frontMatter, `${skill}/SKILL.md starts with front matter`).toBeTruthy();
      const field = (key: string) =>
        frontMatter?.[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim() ?? "";
      expect(field("name"), `${skill}: name matches the folder`).toBe(skill);
      expect(skill).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(skill.length).toBeLessThanOrEqual(64);
      expect(field("description").length, `${skill}: description`).toBeGreaterThan(0);
      expect(field("description").length, `${skill}: description`).toBeLessThanOrEqual(1024);
    }
  });

  it("are the same files for Claude Code", () => {
    const linked = list(".claude/skills");
    expect(linked.sort()).toEqual([...skills].sort());
    for (const skill of linked) {
      expect(lstatSync(`.claude/skills/${skill}`).isSymbolicLink(), skill).toBe(true);
      expect(realpathSync(`.claude/skills/${skill}`)).toBe(realpathSync(`.agents/skills/${skill}`));
    }
  });
});
