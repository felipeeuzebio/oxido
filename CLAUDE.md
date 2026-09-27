# CLAUDE.md

Guidance for Claude (and other coding agents) working in this repository.

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
cargo clippy --workspace --all-targets -- -D warnings
```

Debug builds of `oxido` read the UI from `web/build/client` at runtime; release builds embed it. Run `bun run build` before a release build.

## Where code goes

- Rust logic without I/O: `crates/oxido-core`. The server (HTTP, SQLite, processes, CLI): `crates/oxido`, kept thin over tested functions.
- Frontend: the `web/` workspace (its own `package.json`; the root one holds the repo tooling and runs `web/`'s scripts, so every command above works from the root). The app is in `web/app/` (React Router's default folder): routes in `web/app/routes/`, kept thin (they load data and compose features); each feature in `web/app/features/<feature>/`, its components (`.tsx`) and logic (plain `.ts` modules) together; hooks shared by several features in `web/app/hooks/`; small helpers only in `web/app/lib/`. Tests sit next to the code as `*.test.ts(x)`. shadcn/ui components go in `web/app/components/ui/`.
- Course data: `content/` (`course.toml`, lessons, quizzes). The students' project: `course/minisql/`.
- Local app vs website differences go behind an interface with one implementation per target (see [docs/architecture.md](docs/architecture.md)).

## Rules

1. **Tests first.** Every behavior change starts with a failing test. Bug fixes start with a test that reproduces the bug. Each roadmap phase lists its "Done when" tests in [docs/roadmap-platform.md](docs/roadmap-platform.md).
2. **Conventional Commits** with a scope from [docs/conventions.md](docs/conventions.md). PR titles follow the same format because PRs are squash-merged.
3. **Keep the app light.** No new runtime dependency without a reason in the PR. Lazy-load heavy parts (the quiz code editor, the video player).
4. **Update docs** in the same PR when behavior, structure or a decision changes. Don't re-open a decision in [docs/decisions.md](docs/decisions.md) without saying so explicitly.
5. **Keep oxido locked down.** Every `/api` route needs the session, writes need oxido's own origin, and the host check stays on for everything. Any new route, header or process `oxido` runs gets a test in `crates/oxido/tests/http.rs` and a line in the PR on why it's safe. Never hold the store lock while cargo runs.
6. **Use shadcn/ui and the design tokens.** Build UI from the components in `web/app/components/ui/` (added with `shadcn add`, never hand-edited) before writing custom markup. Colors, fonts and belt colors come from `web/app/app.css` through Tailwind's semantic classes (`bg-card`, `text-muted-foreground`); never hard-code them (`raw-colors.test.ts` checks). Every screen must work in both themes. Rules and the component map: [docs/design.md](docs/design.md).
7. **Let the React Compiler memoize.** Don't add `useMemo`, `useCallback` or `memo` by hand unless a profiler shows a need.

## Content rules (lessons, quizzes, translations)

- Text lessons teach exactly what Bogdan teaches in the matching video: same points, same order, same claims, including mistakes. Never correct him silently; a clearly marked note after his point is allowed.
- Write lessons in new words with new, real-world examples. Never paste or lightly edit transcript text. Transcripts are local reference only (`transcripts/` is git-ignored).
- Build steps may only use Rust features taught up to that phase ([docs/roadmap-course.md](docs/roadmap-course.md)).
- Run lesson prose through the Humanizer skill before opening the PR.
- Translations change prose and, when safe, comments. Never identifiers, string literals or program output.

## Commits by Claude

Keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer on commits you write, so contributions stay attributed.

## Definition of done

- Tests written first, and all of CI passing: Biome, TypeScript, Vitest, Playwright, rustfmt, clippy, cargo tests.
- Docs updated.
- PR description says what changed, why, and which roadmap phase it belongs to.
