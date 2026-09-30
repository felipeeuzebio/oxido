# GitHub workflows and repository settings

## Workflows

| File | Runs on | What it does |
|---|---|---|
| `ci.yml` | every PR, pushes to `main`, merge queue | PR title lint (commitlint); frontend job (Biome, TypeScript 7, Vitest, build, with Rust installed for the content compiler); Rust job (rustfmt, clippy, nextest, doc tests, then `cargo xtask content` and `check-code` on the real course); minimum-Rust job (`cargo check` with the `rust-version` from `Cargo.toml`); dependency job (cargo-deny: advisories, licenses, sources, per `deny.toml`); end-to-end job (Playwright against `oxido`) |
| `claude-review.yml` | PR opened, updated, reopened or marked ready | Claude reviews the diff and posts inline comments plus a summary |
| `claude.yml` | comments, reviews and issues that mention `@claude` | Claude answers or makes the change (users with write access only) |
| `release.yml` | pushes to `main` | release-please keeps a release PR up to date; merging it tags a version and creates the GitHub Release. Publishing `oxido` comes in P11 ([release.md](release.md)) |
| `pages.yml` | pushes to `main` that touch the frontend, the content or the content compiler | compiles the content, builds the website (with `BASE_PATH=/<repo>`) and deploys it to GitHub Pages |

Dependabot (`.github/dependabot.yml`) opens weekly update PRs for Cargo, Bun and GitHub Actions, titled `chore(deps): ...`.

Every action is pinned to a commit SHA, with its version in a comment (`actions/checkout@d234...f30af803 # v6.1.0`). A tag like `@v6` can be moved to other code at any time, so a compromised action would run in our CI with our secrets; a commit can't change. Dependabot updates the SHA and the comment together. `dtolnay/rust-toolchain` has a single tag, `v1`, that follows its `master` branch; it's pinned like the others and takes the toolchain as an input. `tooling.test.ts` fails on any `uses:` that isn't pinned this way.

The cargo-deny job fails when a Rust dependency has a security advisory, a license outside the list in `deny.toml` (all permissive, so they fit an MIT binary), a `*` version, or comes from anywhere but crates.io. A new advisory can appear on any day, so it may fail a PR that didn't touch dependencies. Fix it in its own PR: update the crate (`cargo update -p <crate>`), or, if it doesn't affect `oxido` and there's no fixed version yet, add it to `ignore` in `deny.toml` with the reason.

## One-time setup

1. **Default branch.** The repository's default branch is `main`.
2. **Claude.** Run `claude /install-github-app` from a local clone (you must be a repo admin). It installs the Claude GitHub App and adds a secret. The workflows accept either `CLAUDE_CODE_OAUTH_TOKEN` (Claude subscription) or `ANTHROPIC_API_KEY` (API billing); set one.
3. **Ruleset for `main`** (Settings > Rules > Rulesets > New branch ruleset, target the default branch):
   - Require a pull request before merging; allow squash merge only.
   - Require status checks to pass: `PR title follows Conventional Commits`, `Frontend (lint, types, unit tests, build)`, `Rust (fmt, clippy, tests)`, `Rust minimum version`, `Rust dependencies (cargo-deny)`, `End to end (Playwright against oxido)`, `Claude review`.
   - Block force pushes and deletions.
4. **Pages.** Settings > Pages > Source: GitHub Actions.
5. **Release token (recommended).** Create a fine-grained personal access token with Contents and Pull requests read/write on this repo, and save it as `RELEASE_PLEASE_TOKEN`. Without it, release PRs are opened with the default token, which doesn't trigger CI or the Claude review, so the required checks never report.

## About the Claude review

- It runs on every non-draft PR. Draft PRs are skipped until marked ready.
- The review job passes once Claude has posted its review; it doesn't fail on findings. Treat blocking findings like a human reviewer's "request changes": fix them or explain why not before merging.
- PRs from forks and from Dependabot don't get the repository's secrets, so the automatic review can't run there. The review job is skipped for them, which GitHub counts as passed for the required check, so they aren't blocked. A maintainer can comment `@claude review this PR` to review one through `claude.yml`. To review Dependabot PRs automatically as well, add the Claude secret under Settings > Secrets and variables > Dependabot and remove the Dependabot condition in `claude-review.yml`.
- The review prompt lives in `claude-review.yml`. It points Claude at `CLAUDE.md`, `docs/testing.md` and `docs/conventions.md`, so updating those docs updates what the review checks.
