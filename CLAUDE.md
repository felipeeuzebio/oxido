# CLAUDE.md

Guidance for Claude (and other coding agents) working in this repository. Other agents read it as `AGENTS.md`, a symlink to this file, so edit `CLAUDE.md`.

## What this is

Oxidō is a course platform. Students run `oxido`, a small Rust server, in their minisql project folder; it serves the course in their own browser, keeps progress and notes in SQLite, and runs their stripe tests. The same React frontend is also published on GitHub Pages for reading, watching and quizzes. Students watch Let's Get Rusty's videos on *The Rust Programming Language*, read matching text lessons, take optional quizzes, and grow one project, `minisql`, from white belt to black belt. Read [docs/README.md](docs/README.md) for the map of the docs.

## Commands

```sh
bun install                      # deps + git hooks (lefthook)
bun run build                    # frontend → web/build/client (oxido serves it)
cargo run -p oxido -- serve --project dev/sandbox   # the app on the sandbox project (open the printed link)
bun run dev:all                  # oxido + Vite with hot reload: open the link oxido prints
                                 # once, then work on http://127.0.0.1:5173 (Ctrl+C stops both)
bun run test                     # Vitest (unit + component)
bun run test:e2e                 # Playwright against the real oxido binary
bun run check                    # React Router typegen + TypeScript 7
bun run lint                     # Biome
cargo test --workspace           # Rust tests
cargo xtask content              # compile content/ into web/.content (build and dev run it first;
                                 # a running dev server restarts to serve new lessons)
cargo xtask check-code           # compile every rust block in the lessons
cargo clippy --workspace --all-targets -- -D warnings
```

Debug builds of `oxido` read the UI from `web/build/client` at runtime; release builds embed it. Run `bun run build` before a release build.

## Where code goes

- Rust logic without I/O: `crates/oxido-core`. The server (HTTP, SQLite, processes, CLI): `crates/oxido`, kept thin over tested functions. The content compiler's logic (no I/O either): `crates/oxido-content`; the maintainer commands that read and write for it: `crates/xtask`.
- Frontend: the `web/` workspace (its own `package.json`; the root one holds the repo tooling and runs `web/`'s scripts, so every command above works from the root). The app is in `web/app/` (React Router's default folder): routes in `web/app/routes/`, kept thin (they load data and compose features); each feature in `web/app/features/<feature>/`, its components (`.tsx`) and logic (plain `.ts` modules) together; hooks shared by several features in `web/app/hooks/`; small helpers only in `web/app/lib/`. Tests sit next to the code as `*.test.ts(x)`. shadcn/ui components go in `web/app/components/ui/`, and our variants of them (the tinted `Badge` and `Alert`) in `web/app/components/`.
- Repository tooling (root configs, `scripts/`, and scripts that agent skills bundle): its tests go in `tests/` at the root.
- Course data: `content/` (`course.toml`, lessons, quizzes, and the outlines lessons are written from). The students' project: `course/minisql/`.
- Agent skills: `.agents/skills/<name>/`, which Codex, Gemini CLI, Cursor and VS Code read. Claude Code reads them through symlinks in `.claude/skills/` (`tooling.test.ts` checks both).
- Local app vs website differences go behind an interface with one implementation per target (see [docs/architecture.md](docs/architecture.md)).

## Rules

1. **Tests first.** Every behavior change starts with a failing test. Bug fixes start with a test that reproduces the bug. Each roadmap phase lists its "Done when" tests in [docs/roadmap-platform.md](docs/roadmap-platform.md).
2. **Conventional Commits** with a scope from [docs/conventions.md](docs/conventions.md). PR titles follow the same format because PRs are squash-merged.
3. **Keep the app light.** No new runtime dependency without a reason in the PR. Lazy-load heavy parts (the quiz code editor, the video player).
4. **Update docs** in the same PR when behavior, structure or a decision changes. Don't re-open a decision in [docs/decisions.md](docs/decisions.md) without saying so explicitly.
5. **Keep oxido locked down.** Every `/api` route needs the session, writes need oxido's own origin, and the host check stays on for everything. Any new route, header or process `oxido` runs gets a test in `crates/oxido/tests/http.rs` and a line in the PR on why it's safe. Never hold the store lock while cargo runs.
6. **Use shadcn/ui and the design tokens.** Build UI from the components in `web/app/components/ui/` (added with `shadcn add`, never hand-edited) before writing custom markup. Colors, fonts and belt colors come from `web/app/app.css` through Tailwind's semantic classes (`bg-card`, `text-muted-foreground`); never hard-code them (`raw-colors.test.ts` checks). Every screen must work in both themes. Rules and the component map: [docs/design.md](docs/design.md).
7. **Let the React Compiler memoize.** Don't add `useMemo`, `useCallback` or `memo` by hand unless a profiler shows a need.
8. **Write commits and PRs for the people reading them.** Commit messages, PR titles and PR descriptions can be as technical as the change needs, but they state what changed and why in plain sentences. Leave out AI writing patterns: staged contrasts ("not X, but Y"), lists of three for rhythm, inflated words, bold labels, one-line closers and filler. Check each one with the `humanizer` skill (`.agents/skills/humanizer/`) before committing or opening the PR. Don't mention the roadmaps or their phases (P3, P10) unless the change is about a roadmap itself: they're there to orient agents. The format is in `.github/commit-instructions.md` and `.github/pr-instructions.md`.

## Content rules (lessons, quizzes, translations)

- Text lessons teach exactly what Bogdan teaches in the matching video: same points, same order, same claims, including mistakes. Never correct him silently; a clearly marked note after his point is allowed.
- A lesson is the video in text form, at his level: his steps, short and practical, with nothing he doesn't explain. Details of his setup that have changed since (editor menus, versions on his screen) are given as they are today, without a note.
- The videos follow *The Rust Programming Language* chapter by chapter, and so do the lessons: the official book is the model for the facts, terms, examples and framing, ownership included, and for the register (decision D29), and Jason Walton's abridged version is the model for length. The lesson skill lists them.
- Lessons link what they point to outside the course when it's docs, an extension, a tool or a library (the first mention, by name), never an editor or IDE.
- Write lessons in new words with new, real-world examples. Never paste or lightly edit transcript text. Transcripts are local reference only (`transcripts/` is git-ignored).
- Draft lessons with the `lesson` skill (`.agents/skills/lesson/`, decisions D24 and D28): an outline of the video's points first, then the lesson from it, drafted by three writers and picked by blind judges. The skill's `scripts/transcript-overlap.ts` flags wording copied from the transcript.
- Build steps may only use Rust features taught up to that phase ([docs/roadmap-course.md](docs/roadmap-course.md)).
- Run lesson prose through the `humanizer` skill (`.agents/skills/humanizer/`, in the repository so every agent has it) before opening the PR. The `lesson` skill does it as its last step.
- Translations are drafted with Claude and edited by the maintainer (decision D23), in the same PR as the English lesson when possible. They change prose and comments only, never identifiers, string literals or program output, and they keep the English file's paragraphs (P9's shape check enforces this). Use the terms in [docs/glossary-pt-BR.md](docs/glossary-pt-BR.md), and add new ones there in the same PR.

## Commits by Claude

Keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer on commits you write, so contributions stay attributed.

## Definition of done

- Tests written first, and all of CI passing: Biome, TypeScript, Vitest, Playwright, rustfmt, clippy, cargo tests.
- Docs updated.
- PR description says what changed and why.
