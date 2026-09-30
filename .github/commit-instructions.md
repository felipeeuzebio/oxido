# Commit message instructions

How to write a commit message in this repository. The rules come from `docs/conventions.md` and `commitlint.config.js`, which checks every commit (the lefthook `commit-msg` hook) and every PR title (CI). A message that breaks them is rejected.

## Format

```
<type>(<scope>): <summary>

<body>

<footer>
```

- Keep the header to 72 characters or fewer; commitlint rejects anything over 100.
- Write the summary in lower case, in the imperative, with no period at the end: "add", "fix", "cover", not "Added" or "Fixes". Code and commands go in backticks: "add \`oxido doctor\`".
- Say what the change does for its reader, not which files it touches.

## Type

Pick the type by the change's effect. release-please reads it: `feat` bumps the minor version and `fix` the patch version, so a wrong type ships a wrong version and changelog.

| Type | Use it for |
|---|---|
| `feat` | something new for students or contributors: a feature, a command, a lesson, a quiz, a belt's tests |
| `fix` | a bug fix |
| `docs` | documentation only |
| `test` | tests only, including failing tests committed before their implementation (the red step of TDD) |
| `refactor` | restructuring with no change in behavior |
| `perf` | faster or lighter, with no change in behavior |
| `build` | the build: bundling, compiling, packaging |
| `ci` | GitHub workflows |
| `chore` | tooling, configuration, dependencies, git hooks |
| `style` | formatting only |
| `revert` | undoing an earlier commit |

A breaking change gets a `!` after the scope (`feat(server)!: ...`) or a `BREAKING CHANGE:` footer. Before 1.0 it bumps the minor version.

## Scope

The scope is optional. When present, it must be one of these; any other scope fails commitlint.

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

- Leave the scope out when the change spans several areas or none fits (`refactor: move the frontend into web/`), and when it would only repeat the type (`ci: ...`, not `ci(ci): ...`).
- A file under `web/app/features/quiz/` is `quiz`, not `web`.
- A new or edited lesson, quiz or translation is `content`. The checks and interface text around translations are `i18n`.
- Dependency updates are `chore(deps): bump <name> to <version>`, development dependencies included. `deps-dev` is not a scope.

## Body

Leave it out when the header says everything. Otherwise:

- Write plain prose paragraphs, wrapped at 72 columns. No headings, bold or bullet lists.
- Start with why: what was wrong, missing or risky before. Then what changed, and what a reviewer would ask about: trade-offs, options tried and dropped, which tests cover it, which docs changed with it.
- Name the decision (`D23`) or roadmap phase (`P9`) when the change relates to one.
- Put commands, code identifiers and flags in backticks.
- Use plain, direct sentences. Don't open with "This commit", don't list every file touched, and skip filler like "enhance", "robust" or "seamless".

## Footer

- `BREAKING CHANGE: <what breaks and what to do about it>` for a breaking change.
- `Closes #<issue>` when the commit resolves an issue.
- Commits written with Claude keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer. Keep a trailer that is already there; don't add one otherwise.

## Examples

```
feat(quiz): reveal the correct answer on the results page
fix(editor): cancel a clippy run when the code changes
test(core): cover clippy messages without spans
feat(content): add lesson 4.1 on ownership
feat(minisql): add yellow belt tests
docs(agents): explain the content rules in CLAUDE.md
chore(deps): bump axum to 0.8.10
```

With a body:

```
chore(hooks): format only the staged Rust files

The pre-commit hook ran `cargo fmt --all`, which rewrote every Rust file in
the workspace, including ones with unstaged work in them. It now runs
rustfmt on the staged files, like the Biome hook. Stable rustfmt still
formats the modules a staged file declares with `mod x;`; fixes there stay
unstaged. rustfmt called directly doesn't read Cargo.toml, so the hook
names edition 2024, and tooling.test.ts fails if that drifts from the
workspace's edition.
```
