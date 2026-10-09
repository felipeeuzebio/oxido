# GitHub workflows and repository settings

## Workflows

| File | Runs on | What it does |
|---|---|---|
| `ci.yml` | every PR, pushes to `develop` and `main`, merge queue | PR title lint (commitlint); frontend job (Biome, TypeScript 7, Vitest, build, with Rust installed for the content compiler); Rust job (rustfmt, clippy, nextest, doc tests, then `cargo xtask content` and `check-code` on the real course); minimum-Rust job (`cargo check` with the `rust-version` from `Cargo.toml`); dependency job (cargo-deny, from its release binary: advisories, licenses, sources, per `deny.toml`); end-to-end job (Playwright against `oxido`) |
| `claude-review.yml` | PR opened, updated, reopened or marked ready | Claude reviews the diff and posts inline comments plus a summary |
| `claude.yml` | comments, reviews and issues that mention `@claude` | Claude answers or makes the change (users with write access only) |
| `release.yml` | pushes to `develop` | release-please keeps a release PR into `develop` up to date; merging it tags a version and creates the GitHub Release. Publishing `oxido` comes in P11 ([release.md](release.md)) |
| `pages.yml` | pushes to `main` that touch the frontend, the content or the content compiler | compiles the content, builds the website (with `BASE_PATH=/<repo>`) and deploys it to GitHub Pages |

Dependabot (`.github/dependabot.yml`) opens weekly update PRs for Cargo, Bun and GitHub Actions, titled `chore(deps): ...`.

Every action is pinned to a commit SHA, with its version in a comment (`actions/checkout@d234...f30af803 # v6.1.0`). A tag like `@v6` can be moved to other code at any time, so a compromised action would run in our CI with our secrets; a commit can't change. Dependabot updates the SHA and the comment together. `dtolnay/rust-toolchain` has a single tag, `v1`, that follows its `master` branch; it's pinned like the others and takes the toolchain as an input. `tooling.test.ts` fails on any `uses:` that isn't pinned this way.

The cargo-deny job fails when a Rust dependency has a security advisory, a license outside the list in `deny.toml` (all permissive, so they fit an MIT binary), a `*` version, or comes from anywhere but crates.io. A new advisory can appear on any day, so it may fail a PR that didn't touch dependencies. Fix it in its own PR: update the crate (`cargo update -p <crate>`), or, if it doesn't affect `oxido` and there's no fixed version yet, add it to `ignore` in `deny.toml` with the reason.

The job downloads cargo-deny's Linux binary from its GitHub release and checks it against the SHA-256 in `ci.yml`, rather than using cargo-deny's action, whose Docker image comes from Docker Hub and fails when the shared runner has hit Docker Hub's pull limit. Dependabot doesn't update the binary: to move to a new cargo-deny, change `DENY_VERSION` and `DENY_SHA256` together, taking the hash from the release's `.sha256` file.

## One-time setup

1. **Branches.** Create `develop` from `main` and make it the default branch (Settings > General > Default branch), so new PRs target it.
2. **Claude.** Run `claude /install-github-app` from a local clone (you must be a repo admin). It installs the Claude GitHub App and adds a secret. The workflows accept either `CLAUDE_CODE_OAUTH_TOKEN` (Claude subscription) or `ANTHROPIC_API_KEY` (API billing); set one.
3. **Rulesets** (Settings > Rules > Rulesets > New branch ruleset), one for `develop` and one for `main`, each targeting its branch by name. Both rulesets:
   - Require a pull request before merging, with every review conversation resolved. No approvals are required, since maintainers can't approve their own PRs.
   - Require status checks to pass, reported by GitHub Actions only, so no other app can report them: `PR title follows Conventional Commits`, `Frontend (lint, types, unit tests, build)`, `Rust (fmt, clippy, tests)`, `Rust minimum version`, `Rust dependencies (cargo-deny)`, `End to end (Playwright against oxido)`, `Claude review`.
   - Block force pushes and deletions.
   - Bypass list: the Repository admin role, for pull requests only. An admin can merge a PR whose checks fail for a reason outside it, such as a new cargo-deny advisory, but can't push to either branch directly.

   They differ in the one merge method each allows: squash on `develop`, so every PR lands as one commit, and merge on `main`, so `main` stays connected to `develop` ([release.md](release.md)).
4. **Merge settings** (Settings > General > Pull Requests): allow squash merging and merge commits (for `main`), but not rebase merging. A squash commit takes the PR title as its title and the commit messages as its body, which keeps their `Co-Authored-By` trailers. By default, GitHub titles a one-commit PR's squash with its commit's title instead of the PR title, and release-please reads that title. A merge commit takes the PR title and no body. Turn on "Automatically delete head branches"; the rulesets' deletion rule keeps `develop` and `main` safe from it.
5. **Pages.** Settings > Pages > Source: GitHub Actions. Then, under Settings > Environments > github-pages, allow deployments from `main` only. GitHub first allows the default branch, `develop`, but the website deploys from `main`.
6. **Release token.** Create a fine-grained personal access token with read and write access to Contents, Issues and Pull requests on this repo, and save it as `RELEASE_PLEASE_TOKEN`. release-please needs Issues for the labels it puts on its PR. Without the token, the release workflow fails, because GitHub Actions isn't allowed to open PRs in this repository. Allowing that wouldn't be enough either: a PR opened with the default token doesn't trigger CI or the Claude review, so its required checks never report.

## About the Claude review

- It runs on every non-draft PR except those from `develop` into `main`, which only carry PRs that were already reviewed. Draft PRs are skipped until marked ready.
- The review job passes once Claude has posted its verdict, and fails if Claude finishes without one, for example when no Claude secret is set. It doesn't fail on findings. Treat blocking findings like a human reviewer's "request changes": fix them or explain why not before merging.
- PRs from forks and from Dependabot don't get the repository's secrets, so the automatic review can't run there. The review job is skipped for them, which GitHub counts as passed for the required check, so they aren't blocked. A maintainer can comment `@claude review this PR` to review one through `claude.yml`. To review Dependabot PRs automatically as well, add the Claude secret under Settings > Secrets and variables > Dependabot and remove the Dependabot condition in `claude-review.yml`.
- A PR that changes `claude-review.yml` can't be reviewed, because claude-code-action only runs when the PR's copy of the workflow matches the one on `develop`. The job passes for such a PR with a notice, so review it by hand, and keep those changes in a PR of their own so the rest still gets reviewed.
- The review prompt lives in `claude-review.yml`. It points Claude at `CLAUDE.md`, `docs/testing.md` and `docs/conventions.md`, so updating those docs updates what the review checks.
