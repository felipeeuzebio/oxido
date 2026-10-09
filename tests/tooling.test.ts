// @vitest-environment node
//
// CI and git hook settings that must stay in step with the rest of the repo.
// (Commit message rules have their own test: commitlint.config.test.ts.)
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
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

  // cargo-deny's action builds a Docker image from Docker Hub, which refuses
  // pulls once a shared runner hits its rate limit. The release binary comes
  // from GitHub, and the hash written in the workflow vouches for it.
  it("install cargo-deny from its release, checked against a SHA-256 pinned in the workflow", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).not.toMatch(/cargo-deny-action/);
    expect(ci).toMatch(/DENY_VERSION: \d+\.\d+\.\d+\n/);
    expect(ci).toMatch(/DENY_SHA256: [0-9a-f]{64}\n/);
    expect(ci).toMatch(/sha256sum --check --strict/);
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

  it("skip the Claude review on PRs from develop into main, which only carry reviewed PRs", () => {
    expect(read(".github/workflows/claude-review.yml")).toMatch(/github\.head_ref != 'develop'/);
  });

  it("fail the Claude review when Claude posts no verdict", () => {
    // claude-code-action exits cleanly without reviewing when no Claude secret
    // is set, so the job looks for the verdict line the prompt asks for.
    const review = read(".github/workflows/claude-review.yml");
    expect(review).toMatch(/a last line that starts with `Verdict:`/);
    expect(review).toMatch(/name: Check that Claude posted a verdict[\s\S]*contains\("Verdict:"\)/);
  });

  it("start releases below 1.0, which is P11", () => {
    // With no release yet, release-please starts at 1.0.0 unless told otherwise.
    const config = JSON.parse(read("release-please-config.json"));
    expect(config.packages["."]["initial-version"]).toMatch(/^0\./);
  });

  it("bump oxido in Cargo.lock with every release, since CI builds with --locked", () => {
    const config = JSON.parse(read("release-please-config.json"));
    const files = config.packages["."]["extra-files"].map((file: { path: string }) => file.path);
    expect(files).toEqual(expect.arrayContaining(["crates/oxido/Cargo.toml", "Cargo.lock"]));
  });

  it("open release PRs with our own header", () => {
    // Without one, release-please opens every release PR with a bot greeting.
    const config = JSON.parse(read("release-please-config.json"));
    expect(config["pull-request-header"]).toBeTruthy();
  });
});

describe("end-to-end tests", () => {
  it("compile their fixture course outside web/.content, which the dev server reads", () => {
    const config = read("web/playwright.config.ts");
    const out = config.match(/OXIDO_CONTENT_OUT:\s*"([^"]+)"/)?.[1];
    expect(out, "playwright.config.ts sets OXIDO_CONTENT_OUT").toBeTruthy();
    expect(out).not.toMatch(/^(\.\/)?\.content\/?$/);
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

  it("point only at files that exist", () => {
    // An agent follows a skill's paths literally, so a moved file breaks the
    // skill without any error. Checks repository paths (.agents/skills/...)
    // anywhere in the text, and the skill's own `references/...` and `scripts/...`.
    const missing: string[] = [];
    for (const skill of skills) {
      const dir = `.agents/skills/${skill}`;
      const docs = ["SKILL.md", ...list(`${dir}/references`).map((name) => `references/${name}`)];
      for (const doc of docs.filter((name) => name.endsWith(".md"))) {
        const text = read(`${dir}/${doc}`);
        for (const [path] of text.matchAll(/\.agents\/skills\/[\w./-]*[\w/]/g)) {
          if (!existsSync(path)) missing.push(`${skill}/${doc}: ${path}`);
        }
        for (const [, path] of text.matchAll(/`((?:references|scripts)\/[\w./-]*[\w/])`/g)) {
          if (!existsSync(`${dir}/${path}`)) missing.push(`${skill}/${doc}: ${path}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("have scripts that Node runs as they are, with no build step", () => {
    // Node 24 strips TypeScript types itself, but it only resolves relative
    // imports that name the file. tsconfig's erasableSyntaxOnly keeps out the
    // TypeScript that can't simply be stripped.
    const scripts = skills.flatMap((skill) =>
      readdirSync(`.agents/skills/${skill}`, { recursive: true, encoding: "utf8" })
        .filter((path) => path.endsWith(".ts"))
        .map((path) => `.agents/skills/${skill}/${path}`),
    );
    expect(scripts.length).toBeGreaterThan(0);
    const unnamed = scripts.flatMap((script) =>
      [...read(script).matchAll(/from\s+"(\.\.?\/[^"]+)"/g)]
        .filter(([, path]) => !path.endsWith(".ts"))
        .map(([, path]) => `${script}: ${path}`),
    );
    expect(unnamed).toEqual([]);
    expect(JSON.parse(read("tsconfig.json")).compilerOptions).toMatchObject({
      allowImportingTsExtensions: true,
      erasableSyntaxOnly: true,
    });
  });

  it("spell invisible characters in their scripts as escapes", () => {
    // The AI-writing detector looks for zero-width characters, so its own code
    // names them. Written literally, they're invisible in review.
    const literal = skills.flatMap((skill) =>
      readdirSync(`.agents/skills/${skill}`, { recursive: true, encoding: "utf8" })
        .filter((path) => path.endsWith(".ts"))
        .flatMap((path) =>
          read(`.agents/skills/${skill}/${path}`)
            .split("\n")
            .flatMap((line, i) => (/\p{Cf}/u.test(line) ? [`${skill}/${path}:${i + 1}`] : [])),
        ),
    );
    expect(literal).toEqual([]);
  });

  it("use other skills only through their instructions, never by importing their files", () => {
    // The lesson skill names the humanizer and avoid-ai-writing skills in its
    // SKILL.md; its scripts don't load their code, so each skill updates on its own.
    const reaching = skills.flatMap((skill) => {
      const root = `.agents/skills/${skill}`;
      return readdirSync(root, { recursive: true, encoding: "utf8" })
        .filter((path) => path.endsWith(".ts"))
        .flatMap((path) =>
          [...read(`${root}/${path}`).matchAll(/(?:from\s+|require\()["'](\.[^"']+)["']/g)]
            .map(([, target]) => join(root, dirname(path), target))
            .filter((target) => !target.startsWith(`${root}/`))
            .map((target) => `${root}/${path} loads ${target}`),
        );
    });
    expect(reaching).toEqual([]);
  });

  it.each([
    ["humanizer", "Copyright (c) 2025 Siqi Chen"],
    ["avoid-ai-writing", "Copyright (c) 2026 Conor Bronsdon"],
  ])("keep the vendored %s skill whole, with its license", (skill, copyright) => {
    // Copied unchanged from upstream (docs/sources.md has the versions), so
    // they can be diffed against it. The lesson skill calls them; it doesn't copy them.
    expect(skills).toContain(skill);
    expect(read(`.agents/skills/${skill}/LICENSE`)).toContain(copyright);
  });

  it("run the vendored detector's CommonJS scripts, though the repository is an ES module", () => {
    expect(JSON.parse(read(".agents/skills/avoid-ai-writing/package.json")).type).toBe("commonjs");
  });
});
