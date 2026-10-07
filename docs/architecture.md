# Architecture

## Layout

```
oxido/
├── Cargo.toml            Cargo workspace: the members are in crates/
├── crates/
│   ├── oxido/            `oxido`: the local server students run (CLI, HTTP API, SQLite store)
│   ├── oxido-core/       pure Rust logic with no I/O (diagnostics, grading)
│   ├── oxido-content/    the content compiler's logic, no I/O: content/ in, JSON and lesson HTML out
│   └── xtask/            maintainer commands: cargo xtask content | check-code
├── web/                  the frontend, one Bun workspace package
│   ├── app/              React Router's app folder (static single-page app)
│   │   ├── root.tsx      document shell, theme, layout
│   │   ├── routes.ts     route table; pages in routes/, kept thin
│   │   ├── features/     one folder per feature: components, logic, tests
│   │   ├── components/ui/  shadcn/ui components (generated, not hand-edited)
│   │   ├── hooks/        hooks shared by several features
│   │   └── lib/          small helpers (cn)
│   ├── e2e/              Playwright tests against the real `oxido` binary
│   └── public/           logo and icons
├── content/              course.toml, outlines, and lessons and quizzes per language
├── course/minisql/       the students' project: starters, solutions, stripe tests
├── dev/sandbox/          a course project for working on oxido
├── package.json          repo tooling (lefthook, commitlint, Biome) and the root scripts
├── scripts/              repo scripts (fetching the video transcripts)
├── tests/                tests for the repo tooling and scripts (web/ and crates/ have their own)
├── docs/                 documentation for contributors and agents
├── .agents/skills/       agent skills and their scripts; .claude/skills/ links to them
└── .github/              workflows, Dependabot, PR template, commit and PR instructions
```

## Two ways to take the course

| | Local app (`oxido`) | Website (GitHub Pages) |
|---|---|---|
| How | `cargo install --locked oxido`, then `oxido` in the minisql folder | open the site |
| Lessons, videos, quizzes | yes | yes |
| Progress and notes | SQLite in `<project>/.oxido/oxido.db` | browser storage, this device only |
| Stripe tests, clippy on quiz code | runs the student's local cargo | not available (the page says to run `oxido`) |

Both serve the same frontend build. The page asks `/api/health` at startup: if `oxido` answers, it's the local app; otherwise it's the website. An export/import file moves progress between the two, since they are different sites and can't share browser storage.

## Principles

- **Light by default.** One small Rust binary (a few MB of memory) serves the UI to the browser the student already has open. Content is compiled at build time. The YouTube player and the quiz code editor load only when a page needs them. No AI runs inside the app.
- **Logic outside the UI.** Rust logic that doesn't touch files or the network goes in `oxido-core`; `oxido` stays a thin layer of HTTP, SQLite and process handling. Frontend logic lives in plain `.ts` modules next to the components that use it. Thin layers are easy to test.
- **Stripes come from tests.** A stripe is earned when its test group passes. `oxido` records the first pass, but the tests stay the source of truth; a broken earlier stripe shows as broken.

## The `oxido` server

`oxido` (or `oxido serve`) first finds the course project: the folder it starts in, or the nearest folder above it, that holds `oxido.toml`, the way cargo finds `Cargo.toml`. `oxido init` writes that file (P8). Outside a project it stops and says to `cd` into one or run `oxido init`, so it never starts a course in whatever folder it happens to run in. It then opens `<project>/.oxido/oxido.db`, binds `127.0.0.1:7878`, prints a launch link and opens the browser. Ctrl+C stops it. For working on `oxido` itself, `dev/sandbox/` is a ready-made project.

`oxido doctor` checks what the course needs and prints one line per check, with the fix under each problem: Rust (`rustc` and `cargo` on the PATH, from the same install, no older than the workspace's `rust-version`), clippy, Git, the project, the progress file (its schema version and SQLite's quick check) and the server (running for this project, or who holds the port; skipped outside a project, where there's no telling whose `oxido` is on it). It exits with 1 only when something fails; a missing clippy or Git, or a busy port, is a warning. It tells a tool that isn't installed from one that's installed but won't run (rustup with no default toolchain), and a damaged database from one the student can't open. It only looks: it never creates `.oxido/` or starts anything, and it opens the database read-only, so even a journal left by a crash waits for the next `oxido` run. The report may end up pasted into an issue, so it never prints the launch link and shows paths in the home folder as `~/...`. The rules live in `oxido-core` (`doctor.rs`), the lookups in `oxido`.

| Part | Crate | Notes |
|---|---|---|
| Command line | `clap` | `serve` and `doctor` today; `init` (create the minisql starter) and `check` (run the current stripe) come with P8 |
| HTTP | `axum` on `tokio` | JSON API under `/api`, the UI everywhere else |
| UI files | `rust-embed` | release builds embed `web/build/client`; debug builds read it from disk |
| Storage | `rusqlite` (bundled SQLite) | see below |
| Browser | `webbrowser` | skipped with `--no-open` |

### Keeping other websites out

A server on 127.0.0.1 can still be reached by any page open in the student's browser, and this one will run cargo and write files. So:

1. **Host check.** Every request must say `Host: 127.0.0.1:<port>` or `localhost:<port>`. That stops DNS-rebinding pages, which reach 127.0.0.1 under their own domain name.
2. **Session.** The launch link carries a random 128-bit token that works once. Opening it sets an `HttpOnly`, `SameSite=Strict` cookie named `oxido_session_<port>` that holds a *separate* random secret (never printed), then redirects to drop the token from the address bar. Every `/api` route except `/api/health` needs that cookie. A new secret is made each time `oxido` starts, which ends old sessions. Sites on other domains never get the cookie. Each use replaces the token with a new one, which `oxido` keeps in `<project>/.oxido/launch` together with its port and a random per-run instance id (readable by its owner only; anything running as the same user can already read the database). Running `oxido` again in the same project reads that file, checks through `/api/health` that the same instance still answers, and opens the browser with the waiting link instead of failing on a busy port. The file is removed when `oxido` stops.
3. **Origin check.** Pages served from other ports on 127.0.0.1 count as the same site, so they do get the cookie. Writes (`PUT`, `POST`, `DELETE`) are therefore refused when their `Origin` isn't oxido's own (browsers always send it on cross-origin writes, including `Origin: null`), and oxido never sends CORS headers, so other origins can't read API responses. `oxido serve --dev` also accepts Vite's dev server.
4. **No framing.** Every response has `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` and `X-Content-Type-Options: nosniff`, so no other page can frame oxido and trick a click.

`OXIDO_TOKEN` fixes the launch token for automated tests; students never need it. Ids from the API (class, quiz, stripe, paragraph) are limited to letters, digits, `.`, `-` and `_`, and can't start with `.` or `-`, so they can't climb directories or pass for command-line options when P8 hands them to cargo. When P8 adds test runs, the store lock must not be held while cargo runs.

### Storage

One SQLite file per student project, `.oxido/oxido.db`, next to a `.gitignore` that keeps the folder out of git (the file is binary and holds personal notes). Only the server writes to it. Export writes a copy of it; import merges another copy into it (decision D18).

| Table | Holds |
|---|---|
| `class_progress` | video position, video watched, text lesson read |
| `quiz_results` | latest and best score, done |
| `stripe_passes` | when each stripe's tests first passed |
| `notes` | notes pinned to a video time or a text paragraph |

Queries are plain SQL through rusqlite, with no ORM (decision D19), and rows are read by column name. The schema version is SQLite's `user_version`. `MIGRATIONS` in `crates/oxido/src/store.rs` lists one SQL batch per version, applied in a transaction. Released migrations are never edited, only added to. A database written by a newer `oxido` is refused with a message to update.

### API

| Method and path | Does |
|---|---|
| `GET /api/health` | `{status, version}`; no session needed |
| `GET /api/progress` | everything: classes, quizzes, stripes |
| `PUT /api/classes/{id}/video` | `{seconds?, watched?}`, saved together |
| `PUT /api/classes/{id}/text` | `{read}` |
| `PUT /api/quizzes/{id}` | `{correct, total}` and/or `{done: true}`, saved together; the best score resets if the quiz changes size |
| `GET`, `POST /api/classes/{id}/notes` | list notes, add `{anchor, body}` |
| `PUT`, `DELETE /api/notes/{id}` | edit `{body}`, delete |

Errors come back as `{"error": "..."}` with 400 (invalid input, including bodies and paths that don't parse), 401 (no session), 403 (host or origin), 404 (missing note or unknown API route), 415 (not JSON) or 500.

## Frontend

React 19 with React Router 8 in framework mode, `ssr: false`: a static single-page app whose pages are pre-rendered to HTML at build time. Vite 8 builds it (Rolldown and Oxc), with the React Compiler handling memoization. `BASE_PATH` sets the path prefix for GitHub Pages; the local server uses `/`.

Errors anywhere in the app, from a missing page to a crash, land on the root `ErrorBoundary` in `root.tsx`, which shows the error page (`features/errors/`, see design.md, "Errors"). Unknown paths reach it because `oxido` answers them with the SPA fallback page and the Pages workflow copies that page to `404.html`.

During development, `bun run dev:all` runs two scripts with `bun run --parallel`: `dev:oxido` (`oxido serve --dev` on the sandbox project) and `dev`, which serves the UI on port 5173 and proxies `/api` to `oxido` on 7878. Ctrl+C stops both, and so does either one failing.

## Theme

Light and dark, switched by one toggle; until it's pressed, the app follows the operating system (an internal "system" default). `web/app/features/theme/theme.ts` holds the logic (storage key `oxido:theme`, the `dark` class on `<html>`), `use-theme.ts` wraps it for React, and `ThemeToggle.tsx` is the control. `PRE_PAINT_SCRIPT`, built from the same constants, runs in `<head>` so the page never flashes the wrong colors. The colors for both themes are in `web/app/app.css`. If a content security policy is added in P3, that inline script needs a hash entry.

## Data flow

1. **Content.** `content/` → `cargo xtask content` (`oxido-content`: `markdown` for lessons, `arborium` for code highlighting, decision D26) → `web/.content/`, JSON with each lesson's HTML → the route loaders, which run only while React Router pre-renders each lesson. The lesson route is registered once there's a lesson to pre-render, since a route with a loader must have one when `ssr` is off.
2. **Lesson page.** Lesson HTML + video ID → YouTube player facade (loads on play) → IFrame API for time and seeking.
3. **Quiz code editor.** CodeMirror 6, only on quiz questions with code. `oxido` writes the snippet into a scratch crate in the user's cache folder and runs `cargo clippy` or `cargo run` with a timeout → cargo's JSON messages → `oxido_core::diagnostics::parse_cargo_messages` → editor markers.
4. **Stripes.** The student edits minisql in their own editor. `oxido` watches the files, reruns the current stripe's tests on save (`cargo test --test stripe_NN`), parses the output and pushes results to the page with server-sent events (P8). libtest's JSON output is still nightly-only, so the plain output is parsed.
5. **Progress and notes.** Page events (video position, text read, quiz finished) → `/api` → SQLite. Stripe passes are recorded by `oxido` itself.

## Translations

Lessons and quizzes are translated by hand, with Claude's help (decision D23). Nothing is translated at build time or in the app. `content/en/` holds the English and `content/pt-BR/` the translation, file for file. The content compiler checks each translation against its English file: the same paragraph and quiz IDs, the same inline code, and code blocks that are identical once comments are removed. Each translation records a fingerprint of the English file it was made from; when they stop matching, CI warns that the translation is stale, and the local check shows what changed. Paragraph IDs are shared across languages, so notes stay attached when the student switches language. Interface text comes from typed dictionaries in `web/app/features/i18n/`. Another language needs its code in `languages` in `course.toml`, its folder, its glossary and a reviewer who reads it. Details: [roadmap-platform.md, P9](roadmap-platform.md#p9-translations-en-pt-br).

## Security

- The server's checks above are tested in `crates/oxido/tests/http.rs` and, in a real browser, in `web/e2e/session.test.ts`.
- Student code runs only on the student's own machine, never on project servers.
- A content security policy is set in P3, when the YouTube embed is added.
