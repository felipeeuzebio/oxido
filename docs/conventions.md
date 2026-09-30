# Conventions

## Branches

- `main` is the only long-lived branch. It is protected: changes land through pull requests.
- Work branches: `<type>/<short-description>`, e.g. `feat/quiz-page`, `fix/notes-anchor`.
- PRs are squash-merged, so the PR title becomes the commit message on `main`.

## Commits: Conventional Commits

```
<type>(<scope>): <summary in lower case, no period>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `style`, `revert`.

`feat` bumps the minor version and `fix` the patch version (release-please). A `!` after the scope or a `BREAKING CHANGE:` footer marks a breaking change.

Automated PRs follow the same rules: release-please titles its PRs `chore(release): release x.y.z`, and Dependabot's are `chore(deps): bump ...`, development dependencies included.

The scope is optional. When present, it must be one of these (enforced by `commitlint.config.js`; `commitlint.config.test.ts` fails if this table and the config drift apart, or if release-please's or Dependabot's titles stop passing):

| Scope | Covers |
|---|---|
| `server` | `crates/oxido`: the `oxido` binary, its HTTP API and CLI |
| `core` | `crates/oxido-core` |
| `ui` | shared React components, layout, theming |
| `roadmap` | home screen: belts, phases, "Continue" |
| `lesson` | lesson page: video player and text lesson |
| `quiz` | quiz engine and results page |
| `notes` | video and paragraph notes |
| `progress` | progress tracking, export and import |
| `storage` | the SQLite store in `oxido` and browser storage on the website |
| `editor` | CodeMirror editor and the clippy runner |
| `grader` | build steps and belt tests in the app |
| `i18n` | translation checks, language switching and interface text. Translated lessons and quizzes themselves are `content` |
| `web` | the hosted website (GitHub Pages): its build, base path and browser storage. Code in the `web/` folder otherwise takes the scope of what it is (`ui`, `lesson`, `quiz` and so on) |
| `compiler` | the content compiler (`crates/oxido-content`) and `cargo xtask` (`crates/xtask`) |
| `content` | lessons, their outlines, quizzes, `course.toml` |
| `minisql` | the Mini SQL project: starters, solutions, belt tests |
| `ci` | GitHub workflows |
| `release` | release-please, bundling, signing |
| `deps` | dependency updates (Dependabot uses it) |
| `hooks` | lefthook and commitlint setup |
| `agents` | `CLAUDE.md`, agent skills in `.agents/skills/`, and agent-facing docs in `docs/` |
| `config` | tool configuration (Biome, Vite, TypeScript, Cargo) |

Examples:

```
feat(quiz): reveal the correct answer on the results page
fix(editor): cancel a clippy run when the code changes
test(core): cover clippy messages without spans
feat(content): add lesson 4.1 on ownership
feat(minisql): add yellow belt tests
docs(agents): explain the content rules in CLAUDE.md
chore(deps): bump axum to 0.8.10
```

Commits written with Claude keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.

`.github/commit-instructions.md` and `.github/pr-instructions.md` repeat these rules, the scope table included, for tools that draft commit messages and PR descriptions from the diff alone and can't follow links. Change them together with this file.

## Code style

- Rust: rustfmt defaults, clippy with `-D warnings`, edition 2024. No `unwrap()` outside tests; `expect()` with a reason when a failure is truly impossible.
- TypeScript and React: Biome's formatter and recommended rules (with the React domain), strict TypeScript, function components and hooks. The React Compiler memoizes, so don't add `useMemo`/`useCallback` by hand unless a profiler says so.
- Keep the app light: justify every new runtime dependency in the PR description. CI's cargo-deny job checks a new Rust dependency's license, advisories and source (`deny.toml`).

## Writing style

- Docs and lessons: plain, direct sentences. Lessons go through the Humanizer skill before review.
- Lesson content follows the rules in [roadmap-course.md](roadmap-course.md#class-format).
