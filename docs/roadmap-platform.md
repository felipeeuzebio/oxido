# Platform roadmap

The platform is what students use to take the course: `oxido`, a small local server they run in their minisql folder, which serves the course in their own browser. The same frontend is also published as a website for reading, watching and quizzes. This roadmap is about building that platform. The course itself is planned in [roadmap-course.md](roadmap-course.md).

## Test-driven, phase by phase

Every phase is built test first:

1. Turn each "Done when" line into one or more tests, and commit them failing (red).
2. Write the smallest implementation that makes them pass (green).
3. Clean up with the tests still passing (refactor).

A phase is finished when all of its "Done when" tests pass in CI on `develop`. A ✅ at the end of a "Done when" line marks it as finished, and a phase's heading says "(done)" once every line has one. A PR that changes behavior without a test that would have failed before it is sent back in review, by Claude or by a human. Tools and conventions are in [testing.md](testing.md).

## Phases

### P0: Foundation (done)

Repository, tooling, pipelines and the skeleton of both halves.

Done when:
- `main` builds in CI: Biome, TypeScript 7, Vitest, Playwright against `oxido`, rustfmt, clippy and cargo tests all pass. ✅
- Git hooks run formatting, commitlint and fast tests. ✅
- Every non-draft PR gets a Claude review, and release-please keeps a release PR. ✅
- First TDD seeds: the clippy diagnostics parser (`crates/oxido-core`), quiz grading and results (`web/app/features/quiz`), the theme (`web/app/features/theme`). ✅
- `oxido` serves the UI on 127.0.0.1 with the host, session and origin checks, and stores progress and notes in SQLite with versioned migrations (`crates/oxido`). ✅

### P1: Content pipeline (done)

Lessons, quizzes and course structure become validated data the app can load.

Done when:
- `course.toml`, lesson front matter and quiz files have a schema, and a content compiler (Rust, run at build time) turns them into JSON plus lesson HTML: `markdown` (markdown-rs) for Markdown, `arborium` for code highlighting, its classes mapped to the `--code-*` colors (decision D21). ✅
- Invalid content fails with a clear message: unknown phase, a quiz file no phase uses (and, with `--complete`, a planned quiz or lesson that isn't written), answer index out of range, broken internal link, missing video ID. ✅
- Every ```` ```rust ```` block in a lesson compiles, unless marked `ignore` or `compile_fail`. ✅
- The 44 videos from `playlist.json` are mapped to phases, and each lesson route is pre-rendered. ✅
- Outlines in `content/outlines/` (decision D24) have a schema, aren't published, and the compiler warns when a lesson's `outline` fingerprint doesn't match its outline. ✅

Tests first: valid and invalid content fixtures with expected errors; snapshot tests (insta) of the compiled output.

### P2: Roadmap home and navigation (done)

Done when:
- The home screen shows progress as one long belt (decision D20), the phases, and a "Continue" card, all from the compiled content. ✅
- The rail from the design canvas, with an item for each page that exists (Roadmap and Lesson), and a tab bar along the bottom on phones (decision D30). The kickoff, quiz and build step pages bring their routes and rail items in the phases that fill them (P10, P5, P8). ✅
- Keyboard navigation (a skip link, and focus moved to each new page's heading) and a Ctrl+K command palette, which a Search button also opens (decision D32). Fonts are self-hosted. ✅
- Done early: every error, from an unknown address to a crash, lands on one error page, with the rail kept (design.md, "Errors"). ✅
- The shadcn/ui components design.md lists are added with `shadcn add`, in one PR that settles the dependencies they bring, and the error page's buttons become `Button`. ✅

Tests first: component tests that render a fixture course; a Playwright test that goes home → lesson → back.

### P3: Lesson page

Done when:
- The video loads only when the student presses play (facade), through a typed wrapper around the YouTube IFrame API, and unmounts in the text-only view. ✅
- YouTube's own controls stay, and nothing is drawn over the player (YouTube's embed rules); the saved position and note markers sit in a strip under it (decision D16).
- The text lesson renders next to it with Video / Both / Text views, and the playing video stays in view while the text scrolls (decision D33). ✅
- Timestamp links in the text jump the video to that moment (`[2:47](#t=2:47)` in the lesson). ✅
- Done early: inline code in the text sits on its own chip, and links that leave the course open in a new tab and say so to screen readers (design.md, "Code" and "Links"). ✅
- YouTube embeds play when the page is served by `oxido` on 127.0.0.1 and from GitHub Pages. Checked by hand before the phase (architecture.md, "YouTube embeds"): they do, as long as the player's iframe sends a referrer. ✅
- Every page carries a content security policy that allows YouTube's player and thumbnails and, of inline scripts, only those the page ships (architecture.md, "Security"). ✅

Tests first: the player wrapper against a fake YouTube API, including that the player's iframe keeps a referrer and that time during an ad doesn't count as watched; an e2e test where clicking a timestamp seeks the player.

### P4: Progress tracking

The SQLite store and its API exist since P0; this phase connects them to the UI and adds the website's version.

Done when:
- One storage interface in the frontend with two implementations: the `oxido` API, and browser storage on the website. The page picks one with `/api/health` at startup.
- Progress rules: video watched at 90% (or marked), text read when the end is reached (or marked), quiz done or marked done, a stripe earned when its test group passes, a belt earned when all of its stripes are.
- Resume where the student left off: the roadmap's belt, phase cards and Continue card show the student's progress, and the Continue card opens the lesson they last had open, with its video and text progress bars.
- Export and import progress and notes as a file, including between the website and `oxido` (decision D18): the export is a copy of the SQLite database, and import merges instead of replacing. Schema version 2 adds global note IDs, deleted-note markers and per-value timestamps, and rebuilds the tables it touches as `STRICT` (decision D19).

Tests first: progress rules as pure functions; one contract test suite that runs against both implementations; merge tests where each side has newer changes, a deleted note, and a file from a newer schema.

### P5: Quizzes

Done when:
- The quiz page shows one question per screen with no feedback until the end.
- The results page (seeded in P0) is wired in, with retake, skip and mark as done.
- Attempts are saved through the storage interface.
- Quizzes joins the rail.

Tests first: page flow component tests; an e2e test that finishes a quiz with one wrong answer and reveals it.

### P6: Notes

Done when:
- Video notes are saved at the current timestamp and seek the player when clicked.
- Text notes anchor to a paragraph ID plus a quote selector (prefix, exact, suffix), survive edits to the lesson, and fall back to an "unplaced notes" list instead of disappearing.
- Notes export to Markdown, per lesson.

Tests first: re-anchoring tests for edited, moved and deleted paragraphs.

### P7: Quiz code editor

A small editor for quiz questions with code, not a place to write minisql (students use their own editor for that).

Done when:
- CodeMirror 6 loads only on quiz questions that need it, with a theme built from the `--code-*` colors (decision D21).
- With `oxido`: the snippet is written to a scratch crate in the user's cache folder and checked with `cargo clippy --message-format=json` (or run with `cargo run`) under a timeout, one run at a time, with one shared target directory. Diagnostics use the P0 parser.
- On the website: the question says to run `oxido` to check code, unless the Rust Playground turns out to be usable (terms and rate limits checked first).

Tests first: runner integration test against a real crate (CI); unit tests for timeouts and cancellation.

### P8: Build steps and stripe tests

Done when:
- `course/minisql/` has a starter, a reference solution and a stripe test file per stripe (`tests/stripe_NN.rs`) for each belt.
- `oxido init` creates the starter in a new folder with an `oxido.toml` (the file `oxido` looks for to find the project), runs `git init` with a first commit, and offers to put it on GitHub, public or private (decision D17). `oxido check` runs the current stripe in the terminal.
- `oxido` watches the student's files, reruns the current stripe's tests and `cargo clippy` on save (stale runs cancelled), parses the output, records stripe passes, and pushes results to the page with server-sent events.
- The build step page shows Tests, Problems (clippy) and Output tabs. File and line references are `vscode://file/<path>:<line>` links, so the browser opens VS Code and `oxido` starts no process for it.
- CI proves every reference solution passes its stripe tests and every starter fails them.
- Build joins the rail.

Tests first: the CI check above is written before any belt content; the test-output parser gets fixture outputs from real `cargo test` runs.

### P9: Translations (en, pt-BR)

Lessons and quizzes are translated by hand, with Claude's help (decision D23). This phase builds the checks that keep translations correct, and the language switch.

Done when:
- English content lives in `content/en/` and each translation in a folder named after its language, such as `content/pt-BR/`, with the same file names. Phase titles and stripe descriptions from `course.toml` are translated in `content/pt-BR/course.toml`, keyed by phase ID.
- The content compiler checks every translation's shape against its English file. It fails with a clear message when:
  - a paragraph or heading ID is missing or extra;
  - a quiz's questions, question kinds, option counts or correct answers differ;
  - a paragraph's inline code spans or link targets differ;
  - a code block differs once comments are removed (blocks without comments, like program output, must match exactly).
- Each translated file records a fingerprint of the English file it was made from (`source` in its front matter). When the English file changes, CI adds a warning naming the stale translations, without failing. Run locally, the check lists them with the English diff since each was made: it finds the version with that fingerprint in git history.
- A lesson that has no translation is shown in English, with a short notice.
- The app switches language at runtime without calling any AI and remembers the choice (`oxido:lang`). Until the student picks one, it follows the browser's language. Notes stay attached because paragraph IDs are shared across languages.
- Interface text (buttons, menus, messages) comes from one typed dictionary per language in `web/app/features/i18n/`, so a key missing from pt-BR fails `bun run check`. No i18n library.
- Code blocks carry `translate="no"`. A student who reads the course through the browser's own page translation, in a language we don't ship, still sees the code unchanged.
- The terms in [glossary-pt-BR.md](glossary-pt-BR.md) are decided before the first translated lesson.

Tests first: one shape-check fixture per mismatch, each with its expected error. The fixtures cover a missing paragraph, a renamed identifier in inline code, a changed string literal in a code block, a changed correct answer, and a translated comment, which must pass. A staleness test edits the English fixture and expects the warning.

### P10: Content production

Runs in parallel once P1 is done: the kickoff page (with its route and the rail's Kickoff item), 44 text lessons, 10 quizzes and 11 build steps, each with its pt-BR translation, in the same PR when possible. Each lesson is drafted with the `lesson` skill (decisions D24 and D28), which ends with a pass of the Humanizer skill, and its PR goes through the content checklist in the PR template.

### P11: Version 1.0

Done when:
- `cargo install --locked oxido` works from crates.io, with the built UI inside the published crate and our release settings in its manifest (see [release.md](release.md)).
- cargo-dist builds prebuilt binaries for Windows, macOS and Linux on each release, and `cargo binstall oxido` finds them.
- Accessibility and performance checks pass, with budgets set in this phase (JavaScript size, `oxido` idle memory, first-install compile time).
