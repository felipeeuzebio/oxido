# Contributing

Thanks for helping. This page is the short version; details are linked.

## Setup

1. Install [Rust](https://rustup.rs) and [Bun](https://bun.sh).
2. `bun install`. This also installs the git hooks.
3. `bun run build && cargo run -p oxido -- serve --project dev/sandbox` to run the app on the sandbox project, or see the README for hot reload.

## Workflow

1. Pick an item from [docs/roadmap-platform.md](docs/roadmap-platform.md) or an issue.
2. Branch from `main`: `feat/quiz-page`, `fix/notes-anchor`, and so on.
3. **Write the failing test first**, then the code that makes it pass, then clean up. See [docs/testing.md](docs/testing.md).
4. Commit with Conventional Commits, e.g. `feat(quiz): show one question per screen`. Scopes: [docs/conventions.md](docs/conventions.md).
5. Open a PR with a Conventional Commits title and fill in the template.
6. CI and the Claude review run automatically. Address blocking review comments before merging.
7. PRs are squash-merged into `main`.

## Git hooks

Installed by lefthook when you run `bun install`:

| Hook | Runs |
|---|---|
| pre-commit | Biome on staged files, `cargo fmt` (fixes are re-staged) |
| commit-msg | commitlint |
| pre-push | Rust tests and clippy, Vitest, the type check |

Run one by hand with `bunx lefthook run pre-commit`. CI runs the same checks, so skipping a hook (`LEFTHOOK=0`) only delays the failure.

## Content contributions

Lessons and quizzes follow the rules in [docs/roadmap-course.md](docs/roadmap-course.md#class-format). In short: same teachings as the video, in your own words, with no transcript text.

## Working with Claude

- Mention `@claude` in an issue or PR comment to ask a question or request a change.
- Claude Code reads [CLAUDE.md](CLAUDE.md) for project rules.
- Commits written with Claude keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.
