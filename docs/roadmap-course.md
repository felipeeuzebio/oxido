# Course roadmap: build a Mini SQL database

The course follows Let's Get Rusty's "The Rust Lang Book" playlist (44 videos), which walks through *The Rust Programming Language* chapter by chapter. Instead of three separate exercises, students build one project from the first class to the last: `minisql`, a small SQL database with a terminal prompt that ends up as a multithreaded server.

The machine-readable version of this roadmap is [`content/course.toml`](../content/course.toml). Keep the two in sync.

## How a phase works

1. **Classes.** Each class is Bogdan's video followed by a task that puts it to use (see "Class format" below).
2. **Quiz (optional).** Shown after one or more classes. It never blocks progress.
3. **Build step.** One feature for `minisql`, built across the phase's classes: each class's task adds a piece of it, using only what the videos up to that class have taught.
4. **Stripes and belt test.** The build step is split into stripes, and each stripe has its own group of provided tests. Passing a group earns the stripe; all of a belt's stripes (4 to 6) earn the belt. Phases 1 to 3 come with provided tests only, because testing is taught in chapter 11. From phase 4 (green belt) on, students also write their own failing test before each feature, and the provided tests still check the result.

Every belt ends with a program that works on its own. Every belt also has a starter checkpoint, so a student whose code is broken can reset to it or join at that belt.

## Belts and stripes

There are 8 belts, and each belt has stripes, like the stripes on a Brazilian jiu-jitsu belt. A stripe is one small feature with its own group of tests. Passing the group earns the stripe, and earning every stripe of a belt earns the belt.

The number of stripes follows the material, from 4 to 6 per belt and 40 in all, roughly one per video. The early belts cover lighter chapters and get 4 or 5. Purple, brown and black each cover two phases and the hardest chapters (15 to 20), so they get 6. Without that, a student could go ten or more videos without a visible step forward. Each stripe is also one test-driven cycle: its tests go from red to green.

Each stripe is part of a class's task (decision D35), and a class can take more than one. The counts don't line up phase by phase: the first three phases have more stripes than videos, and Traits, Lifetimes and Tests, Smart Pointers, Objects and Patterns, Advanced Rust and Database Server have fewer. When the stripes are assigned to classes, a class left without one gets a stripe split from a neighbor's or a drill, and the counts above may change.

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

## Drills

A class whose topic has no natural place in `minisql` gets a drill as its task (decision D35). A drill is a small crate with a function stubbed out with `todo!()` and its tests already written, 10 to 20 minutes of work. Passing it completes the class but earns no stripe, so a belt still means `minisql` works. The drills so far:

- Unsafe Rust (video 36): `first_and_last_mut`, which returns mutable references to a slice's first and last items through a raw pointer, and `None` when the slice has fewer than two, since a single item would mean two mutable references to the same value.
- Procedural macros (video 41): `#[derive(TableName)]`, which gives a struct a `table_name()` that returns its name in lowercase.

Drills live in `course/drills/<name>/` (starter, solution and tests), and `oxido init` copies their starters into the student's `drills/` folder. Each one is its own workspace, with an empty `[workspace]` table in its `Cargo.toml`, so `minisql`'s workspace from purple belt on never takes it in. The tests check behavior only: a student who passes the unsafe drill without a raw pointer still passes.

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
| 10 Advanced Rust | Black | 19 | Newtypes (`RowId`, `ColumnName`); a `Result` type alias; `Index<RowId>` for `Table`; aggregate functions (`count`, `max`) as function pointers; a declarative macro for test scripts; unsafe and procedural macros as drills | Quiz 9 |
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

Each class has two parts (decision D35):

1. **Bogdan's video**, embedded from YouTube, with the chapters its outline names on the strip under it.
2. **A task** that puts the video to use: one or more stripes of `minisql`, or a drill. Class 1's task is the setup: installing Rust and `oxido`, then `oxido init`.

The task's brief is short. It says what to build and what the tests check, and it doesn't teach the topic again or show the solution. A task uses only what the videos up to and including its class have taught, which each outline's "Introduces" list records. Hints point at the book's section for the chapter ([sources.md](sources.md)) and at moments in the video: a hint names an outline point, and the page plays the video from that point's time. When something he shows has changed since the video (an editor menu, a version on his screen), or he gets something wrong, the brief says so in a short, clearly marked note; he's never corrected silently. Briefs are written in new words, link docs, tools and libraries by name at their first mention (never an editor or IDE), and go through the Humanizer skill before review.

Transcripts are reference material for writing outlines. `uv run scripts/fetch_transcripts.py` downloads them into `transcripts/` once (decision D25), and when YouTube blocks your IP it waits and tries again. They stay out of the repository (`transcripts/` is in `.gitignore`). Outlines are written with the `lesson` agent skill's outline step (decision D24): his points in order, in new words, with the time of each, his asides, and the Rust features the video introduces.

## Content format

`cargo xtask content` checks all of this; the compiler's fixture course (`crates/oxido-content/tests/fixtures/valid/`) has one of each.

- `content/course.toml` holds the phases, belts and quizzes, and each phase's `videos`: YouTube IDs, in playlist order. Each phase has a `summary`, one sentence for students that the roadmap shows on the phase's card; `build` stays the planning note. In a summary or a stripe, code goes between a pair of backticks, and the compiler rejects an unmatched one.
- A class's file is `content/en/<phase>/<NN>-<slug>.md`, where NN is its video's position in the playlist. It starts with TOML front matter between `+++` lines: `title`, `video`, `outline` (the fingerprint of the outline it was written from), and its task, one of `stripes = [1, 2]`, `drill = "unsafe"` or, in class 1, `setup = true` (decision D35). Stripes are numbered the way their belt numbers them, as in the table above and the stripe tests' files, so a phase 7 class's stripes start at purple's stripe 3. A stripe belongs to one class, and with `--complete` the compiler checks that every stripe belongs to one. The body is the task's brief, with sections starting at `##`. Code blocks are `rust` (marked `ignore` or `compile_fail` when needed), `toml`, `bash`, `sh`, `console` or `text`. A link to another lesson points at its file: `[shadowing](02-variables.md#shadowing)`. A hint links a moment in the video by its outline point, `[right after compiling](video:7)`, and the page plays the video from that point's time. Nobody types a time: the compiler rejects a link to one (`#t=2:47`).
- A quiz is `content/en/quizzes/<id>.toml`, with one `[[questions]]` table per question: `MultipleChoice` (`choices`, and `answer` as an index), `ShortAnswer` (`answer`, `alternatives`) or `Tracing` (`program`, `does_compile`, `stdout`).
- An outline is `content/outlines/<NN>-<slug>.md`, with `video`, `title`, `duration` (the video's length, `m:ss`, from the transcript) and `chapters` in its front matter (decisions D24 and D35). `chapters` names each chapter of the video and the point it starts at, `chapters = [{ point = 1, title = "Getting started" }, { point = 2, title = "Install Rust" }]`: the first starts at point 1 and the rest follow the video. The strip under the player shows them. Each numbered point starts with the time he makes it, `[m:ss]`: the compiler checks that the points are numbered in order, follow the video and end before it does.

## Quizzes

- One question per screen, no feedback while answering.
- A results page at the end marks each question right, wrong or skipped. Wrong and skipped questions have a "Show correct answer" section with the answer and an explanation.
- "Skip" and "Mark as done" are always available, and retakes are allowed.
- Question kinds follow mdbook-quiz: `MultipleChoice`, `ShortAnswer` and `Tracing` ("does this compile, and what does it print?").

## Where things live

- `content/course.toml`: phases, belts, chapters, quizzes.
- `content/en/<phase>/`: one file per class, its task brief (decision D35); `content/en/quizzes/`: quizzes (platform phases P1 and P10). Translations mirror them in `content/<lang>/` (P9).
- `content/outlines/`: one outline per video, the points its lesson is checked against (D24). English only, never shown to students.
- `course/minisql/`: starter code, reference solution and belt tests for each belt (platform phase P8).
- `course/drills/`: starter, reference solution and tests for each drill (platform phase P8).
