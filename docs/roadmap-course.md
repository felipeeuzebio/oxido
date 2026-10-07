# Course roadmap: build a Mini SQL database

The course follows Let's Get Rusty's "The Rust Lang Book" playlist (44 videos), which walks through *The Rust Programming Language* chapter by chapter. Instead of three separate exercises, students build one project from the first class to the last: `minisql`, a small SQL database with a terminal prompt that ends up as a multithreaded server.

The machine-readable version of this roadmap is [`content/course.toml`](../content/course.toml). Keep the two in sync.

## How a phase works

1. **Classes.** Each class is Bogdan's video plus a text lesson (see "Class format" below).
2. **Quiz (optional).** Shown after one or more classes. It never blocks progress.
3. **Build step.** The student adds one feature to `minisql`, using only what the videos have taught so far.
4. **Stripes and belt test.** The build step is split into stripes, and each stripe has its own group of provided tests. Passing a group earns the stripe; all of a belt's stripes (4 to 6) earn the belt. Phases 1 to 3 come with provided tests only, because testing is taught in chapter 11. From phase 4 (green belt) on, students also write their own failing test before each feature, and the provided tests still check the result.

Every belt ends with a program that works on its own. Every belt also has a starter checkpoint, so a student whose code is broken can reset to it or join at that belt.

## Belts and stripes

There are 8 belts, and each belt has stripes, like the stripes on a Brazilian jiu-jitsu belt. A stripe is one small feature with its own group of tests. Passing the group earns the stripe, and earning every stripe of a belt earns the belt.

The number of stripes follows the material, from 4 to 6 per belt and 40 in all, roughly one per video. The early belts cover lighter chapters and get 4 or 5. Purple, brown and black each cover two phases and the hardest chapters (15 to 20), so they get 6. Without that, a student could go ten or more videos without a visible step forward. Each stripe is also one test-driven cycle: its tests go from red to green.

| Belt | Stripes |
|---|---|
| White (4) | 1. `db > ` prompt that reads lines in a loop · 2. `.exit` ends the program · 3. `.help` lists commands, unknown input prints an error · 4. quits cleanly when input ends |
| Yellow (4) | 1. `Row` parsed from `insert 1 alice alice@example.com` · 2. `Statement` enum and `prepare()` returning `Option` · 3. insert into a fixed-size table with a "table full" error · 4. `select` prints every row |
| Orange (5) | 1. code split into modules · 2. `Vec` storage and `String` length checks · 3. `HashMap` index that rejects duplicate ids · 4. `PrepareError` returned with `Result` and `?` · 5. save on `.exit`, load on start |
| Green (4) | 1. `Record` trait and generic `Table<R>` · 2. `Token<'a>` tokenizer · 3. unit tests, written first · 4. integration tests that run whole scripts, written first |
| Blue (5) | 1. `minisql <file.db>` with `Config::build` · 2. errors on stderr with a non-zero exit code · 3. `WHERE ... CONTAINS`, case-insensitive with `MINISQL_IGNORE_CASE` · 4. closures for filters · 5. `Cursor` that implements `Iterator`, loops become iterator chains |
| Purple (6) | 1. workspace with `minisql-core` and `minisql-cli` · 2. doc tests, release profile, `cargo install` · 3. index rebuilt as a tree of `Box<Node>` · 4. `Drop` saves the database on close · 5. `Rc<RefCell<T>>` query log shared by the REPL and the table · 6. schema catalog with `Weak` parent links |
| Brown (6) | 1. parallel `.import` with one worker thread per file · 2. rows sent over `mpsc` to a single writer · 3. `Arc<Mutex<Database>>` shared by several sessions · 4. `Box<dyn Storage>` with memory and file backends · 5. `BEGIN` / `COMMIT` / `ROLLBACK` as a state pattern · 6. parser rewritten with match guards, `@` bindings and nested destructuring |
| Black (6) | 1. newtypes (`RowId`, `ColumnName`) and a `Result` alias · 2. `Index<RowId>` for `Table` · 3. aggregates as function pointers · 4. a declarative macro for test scripts · 5. `minisql serve` with a query page and `POST /query` · 6. `ThreadPool` and graceful shutdown that saves the database |

Topics that don't fit the project naturally (for example unsafe Rust) get short side drills next to the class instead of being forced into `minisql`.

## Phases

| Phase | Belt | Book ch. | Build step | Quiz |
|---|---|---|---|---|
| Kickoff | | none | Demo of the finished `minisql` (terminal and web), the roadmap, how belts and tests work | none |
| 1 First Steps | White | 1-3 | `cargo new minisql`; a `db > ` prompt that reads commands in a loop; `.exit`, `.help`, and an error for unknown commands | Quiz 1 |
| 2 Rows and Statements | Yellow | 4-6 | `Row` struct (`id`, `username`, `email`); `Statement` enum; `insert` and `select` into a fixed-size table of `Option<Row>` with a "table full" error | Quiz 2 |
| 3 Organize and Persist | Orange | 7-9 | Modules (`repl`, `parser`, `table`, `storage`); `Vec<Row>` plus a `HashMap` index that rejects duplicate ids; `PrepareError` returned through `Result` and `?`; save on `.exit`, load on start | Quiz 3 |
| 4 Traits, Lifetimes and Tests | Green | 10-11 | `Record` trait and generic `Table<R>`; a `Token<'a>` tokenizer that borrows from the input line; unit tests and integration tests that run whole scripts | Quiz 4 |
| 5 The minisql CLI | Blue | 12-13 | `minisql <file.db>` with `Config::build`; errors to stderr with a non-zero exit code; `select where <column> contains <text>`, case-insensitive with `MINISQL_IGNORE_CASE`; then a `Cursor` that implements `Iterator`, with closures for filters | Quiz 5 |
| 6 Ship It | Purple | 14 | Workspace with `minisql-core` (library) and `minisql-cli` (binary); doc comments with runnable examples; release profile; `cargo install --path` | (in Quiz 6) |
| 7 Smart Pointers | Purple | 15 | Index rebuilt as a binary search tree of `Box<Node>`; schema catalog where columns point back to their table through `Weak`; `Drop` saves the database on close | Quiz 6 (ch. 14-15) |
| 8 Going Parallel | Brown | 16 | `.import a.csv b.csv` parses files on worker threads that send rows through an `mpsc` channel to one writer; `Arc<Mutex<Database>>` for several sessions at once | Quiz 7 |
| 9 Objects and Patterns | Brown | 17-18 | `Box<dyn Storage>` with memory and file backends; `BEGIN` / `COMMIT` / `ROLLBACK` as a state pattern; parser rewritten with match guards, `@` bindings and nested destructuring | Quiz 8 |
| 10 Advanced Rust | Black | 19 | Newtypes (`RowId`, `ColumnName`); a `Result` type alias; `Index<RowId>` for `Table`; aggregate functions (`count`, `max`) as function pointers; a declarative macro for test scripts; unsafe as a side drill | Quiz 9 |
| 11 Database Server | Black | 20 | `minisql serve`: `TcpListener`, a query page at `/`, `POST /query` returning an HTML table, a `ThreadPool`, and graceful shutdown that saves the database | Final quiz |

## What the finished project looks like

Terminal (white belt through black belt):

```text
$ minisql library.db
db > insert 1 alice alice@example.com
Executed.
db > insert 2 bob bob@example.com
Executed.
db > select where username contains ALI
(1, alice, alice@example.com)
Executed.
db > .exit
```

Web (black belt): `minisql serve library.db --port 7878` serves a page with a query box and renders results as a table, handled by a pool of worker threads.

## Class format

Each class has two parts:

1. **Bogdan's video**, embedded from YouTube.
2. **A text lesson** that covers the same points in the same order and keeps his claims as he states them, including anything he gets wrong. No silent corrections: if a later Rust version changed something, the lesson can add a clearly marked note after his point, never instead of it. The lesson reads like the video in text form: his steps, at his level, with nothing he doesn't explain, and with details of his setup that have changed given as they are today. It is written in new wording with new, real-world code examples. It is never a lightly edited transcript. The videos and the book go hand in hand, so the lesson is written with the book's chapter open ([sources.md](sources.md)): the official book for the facts, terms, examples and framing, which the videos follow, and for the register (decision D29), and Jason Walton's abridged version as the model for length. The lesson teaches the way Bogdan does, in the course's own voice, a notch more formal than his speech; the outline records his asides so the lesson can carry them. Prose goes through the Humanizer skill before review.

Transcripts are reference material for writing lessons. `uv run scripts/fetch_transcripts.py` downloads them into `transcripts/` once (decision D25); when YouTube blocks your IP, it waits and tries again, which stays out of the repository (it's in `.gitignore`). Lessons are drafted with the `lesson` agent skill (decision D24): first an outline of the video's points in new words, then the lesson written from that outline.

## Content format

`cargo xtask content` checks all of this; the compiler's fixture course (`crates/oxido-content/tests/fixtures/valid/`) has one of each.

- `content/course.toml` holds the phases, belts and quizzes, and each phase's `videos`: YouTube IDs, in playlist order.
- A lesson is `content/en/<phase>/<NN>-<slug>.md`, where NN is its video's position in the playlist. It starts with TOML front matter between `+++` lines: `title`, `video`, and `outline` (the fingerprint of the outline it was written from). Sections start at `##`. Code blocks are `rust` (marked `ignore` or `compile_fail` when needed), `toml`, `bash`, `sh`, `console` or `text`. A link to another lesson points at its file: `[shadowing](02-variables.md#shadowing)`.
- A quiz is `content/en/quizzes/<id>.toml`, with one `[[questions]]` table per question: `MultipleChoice` (`choices`, and `answer` as an index), `ShortAnswer` (`answer`, `alternatives`) or `Tracing` (`program`, `does_compile`, `stdout`).
- An outline is `content/outlines/<NN>-<slug>.md`, with `video` and `title` in its front matter (decision D24).

## Quizzes

- One question per screen, no feedback while answering.
- A results page at the end marks each question right, wrong or skipped. Wrong and skipped questions have a "Show correct answer" section with the answer and an explanation.
- "Skip" and "Mark as done" are always available, and retakes are allowed.
- Question kinds follow mdbook-quiz: `MultipleChoice`, `ShortAnswer` and `Tracing` ("does this compile, and what does it print?").

## Where things live

- `content/course.toml`: phases, belts, chapters, quizzes.
- `content/en/<phase>/`: lessons; `content/en/quizzes/`: quizzes (platform phases P1 and P10). Translations mirror them in `content/<lang>/` (P9).
- `content/outlines/`: one outline per video, the points its lesson is checked against (D24). English only, never shown to students.
- `course/minisql/`: starter code, reference solution and belt tests for each belt (platform phase P8).
