# Decisions

Short records of choices already made, so nobody (human or agent) re-opens them by accident. To change one, open a PR that edits this file and explains why.

## D1. Course project: Mini SQL database (2026-09-25)

One project grows through the whole course, from white belt to black belt. The Mini SQL database was chosen over a log analyzer, a ray tracer, an autograd engine, an interpreter and a chat server because every chapter has a natural job in it, including `Weak` pointers (schema catalog) and threads (parallel import, shared sessions), and it ends with a satisfying server. Trade-off: a real B-tree is too much, so the index is a simple binary tree.

## D2. Own app instead of mdBook (2026-09-25)

Progress tracking, notes, video syncing and the editor would all be scripts bolted onto an mdBook theme. We render content ourselves but keep it in Markdown and TOML, and borrow mdbook-quiz's question kinds so content stays portable.

## D3. Tauri 2 desktop app plus a static web build (2026-09-25, replaced by D11)

Live clippy needs a real Rust toolchain, which students install in class 1 anyway. The same frontend is published as a static site for reading and watching; there, code runs through the Rust Playground.

## D4. Svelte 5 + SvelteKit (adapter-static), Biome, Bun (2026-09-25, frontend part replaced by D12)

Small runtime, documented Tauri setup. Biome handles formatting and linting for TS, Svelte, JSON and CSS. Bun is the package manager and script runner; it doesn't affect the published files.

## D5. Build-time AI translation of prose only (2026-09-25, replaced by D23)

No AI in the app. Code blocks are never sent to the translator; comments are translated only when the code stays identical and parses. Reviewed in PRs like any other content.

## D6. Text lessons follow the video, in new words (2026-09-25)

Lessons keep Bogdan's teachings exactly (order, claims, including mistakes) but are written fresh, with new examples. No transcript text in the repository.

## D7. Hosting: GitHub Pages first (2026-09-25)

The web build is static. GitHub Pages is free and lives with the repo. Move to Cloudflare Workers static assets if we need PR previews, custom headers, more traffic, or commercial use (Pages and Vercel Hobby don't allow it).

## D8. Every PR is reviewed by Claude (2026-09-25)

`claude-review.yml` runs on every non-draft PR and is a required check on `develop` and `main`. PRs from `develop` into `main` skip it, since they only carry PRs that were already reviewed (D27).

## D9. Stripes inside belts, sized by the material (2026-09-25)

Belts stay as the big milestones, and each one gets stripes (as in Brazilian jiu-jitsu). A stripe is one group of belt tests. Counts follow the material: 4 to 6 per belt, 40 in all, roughly one per video. The dense later belts (purple, brown, black) get 6 so there's never a long stretch without a visible step, and each stripe lines up with one red-to-green test cycle. See [roadmap-course.md](roadmap-course.md#belts-and-stripes).

## D10. shadcn-svelte on Tailwind v4, in the Dojo and Forge colors (2026-09-25, replaced by D12)

UI is built from shadcn-svelte components (style Vega, Lucide icons) so we don't hand-roll buttons, dialogs, tabs and toggles. The theme variables were renamed to shadcn-svelte's names with the same hex values, so added components come out in Dojo and Forge without restyling. Dark mode moved from a `data-theme` attribute and our own controller to mode-watcher and the `.dark` class, the setup shadcn-svelte documents; saved choices keep working because the storage key didn't change. The navigation stays our own rail instead of shadcn's `Sidebar`, to keep the icon-over-label look. See [design.md](design.md#components).

## D11. A local web app instead of a desktop app (2026-09-25)

A course platform that installs like a desktop program felt out of place, like Udemy as a desktop app. Students now run `oxido`, a small Rust server, in their minisql folder, and take the course in the browser they already have open, the way rustlings works but with a web UI. It still runs cargo locally, works offline except for videos, and uses less memory than a second copy of a web engine. Rust over Go or Bun for the server: every student has cargo after class 1 (Go and Bun would be extra installs), and a minimal Rust server measured 4 MB of memory against 10 MB for Go and 42 MB for Bun ([sources.md](sources.md#measurements)). The same frontend is also published on GitHub Pages for reading, watching and quizzes.

## D12. React with Vite 8 and React Router; shadcn/ui (2026-09-25)

The maintainer is a React developer and most of the code is written with an AI agent, so review matters more than syntax: React bugs are the ones he can spot. React also brings the original shadcn/ui, MDX, and wrappers for editors and players. Svelte's smaller bundle doesn't matter for an app served from the student's own machine (measured: about half a megabyte of memory difference). Next.js was ruled out because its strengths need a server; React Router's framework mode pre-renders pages without one. Build: Vite 8 (Rolldown, Oxc), the React Compiler, TypeScript 7 for type checks, Biome with its React rules (Oxlint kept as an option). The Dojo and Forge colors carry over unchanged under shadcn/ui's variable names; dark mode is the `.dark` class set by our own small, tested theme controller.

## D13. Progress and notes in SQLite (2026-09-25)

`oxido` stores progress and notes in `<project>/.oxido/oxido.db` (rusqlite, bundled SQLite). Plain files were considered (readable, git-friendly), but SQLite was chosen for durable, transactional storage that can grow into history, statistics and note search. The folder is git-ignored because the file is binary and holds personal notes; an export file covers backups and moving between machines. Schema versions use SQLite's `user_version` with append-only migrations, and a database from a newer `oxido` is refused. The website keeps using browser storage.

## D14. The built-in editor is for quizzes only (2026-09-25)

Students write minisql in their own editor (VS Code with rust-analyzer already gives them better feedback than anything we'd build). `oxido` watches their files and reruns the current stripe's tests on save. A small CodeMirror editor stays, but only for quiz questions with code, checked by `oxido` in a scratch crate.

## D15. The name: Oxidō (2026-09-25)

The project was "LGR Redux". It's now Oxidō: *oxide* (rust) plus *-dō*, "the way," as in judo, aikido and kendo, which fits both the language and the belt system. It also drops the Let's Get Rusty initials from the product name, so nobody takes it for an official LGR product (the course still credits Bogdan everywhere). The display name keeps the macron; identifiers use `oxido`, which was free on crates.io when checked.

## D16. No video player library: YouTube's own player (2026-09-25)

Every video is Bogdan's, on YouTube, so the lesson page embeds YouTube's player: a facade (thumbnail and play button) until the student presses play, then the IFrame API through our own small typed wrapper for the current time, seeking and "watched". YouTube's own controls stay. Its rules for embeds forbid drawing anything in front of the player, controls included, so our additions (the saved position and note markers) sit in a strip under it. That same rule is why the libraries we looked at don't fit: Video.js v10 and Kibo UI (media-chrome) are worth having for their themed control bars, which sit over the video; react-player supports many sites we don't need, and its one useful piece here, the click-to-load facade, is what we build anyway. Video.js v10's YouTube support was still a release candidate on this date (rc.3 fixed the current time not updating during YouTube playback). Revisit Video.js v10 once it's stable if Oxidō ever hosts its own video files: its shadcn-style skins would fit this design. Sources in [sources.md](sources.md#platform).

## D17. The student's repo: plain git, GitHub optional (2026-09-26)

`oxido init` creates the minisql starter, runs `git init` and makes the first commit. It then asks whether to put the repo on GitHub and, if so, public or private: that's the student's choice, and nothing else in Oxidō depends on it. With the GitHub CLI installed and signed in, `oxido init` runs `gh repo create minisql --public|--private --source . --push`; otherwise it prints that command. Oxidō has no GitHub login and never holds GitHub credentials. Progress and notes never go into the repo (`.oxido/` is git-ignored, D13), so a public repo stays a clean minisql project.

## D18. Moving between machines: the export file only (2026-09-26)

Progress and notes stay in SQLite on each machine (D13), and the only way to move them is to export a file and import it elsewhere, including between the website and `oxido`. Automatic sync was considered and dropped: through the student's repo (a public repo would publish notes and quiz scores, and progress would land in their commits), through a second private repo, Notion, Google Drive's app folder, an encrypted secret gist, or a cloud-synced folder (syncing the live database file can corrupt it). Each needed an account, an app registered with a provider, or a server, for a convenience the export file mostly covers.

The export file is a copy of the database (`VACUUM INTO`), marked with Oxidō's `application_id`. Import merges instead of replacing, so importing an older file never loses newer work: for each value the newer change wins, except that a quiz's best score only goes up and a stripe keeps its earliest pass (whether it passes now still comes from the tests). That needs schema version 2: a global ID for each note, a marker for deleted notes so an import doesn't bring them back, and a timestamp per value where one row holds several. The imported file is untrusted input: size-limited, its schema compared with ours before any row is read, a newer schema refused, and SQLite's defensive settings on. The website reads and writes the same file with SQLite's WebAssembly build, loaded only when the student imports or exports.

## D19. No ORM: plain SQL through rusqlite (2026-09-26)

The store stays rusqlite with hand-written SQL and our own `user_version` migrations. Its hard queries are SQLite-specific (the best-score upsert with `CASE` and `max()`, the import merge through `ATTACH`, `PRAGMA`s, full-text search later), so they'd be raw SQL under any ORM, which would only take over a handful of easy queries on four tables. Plain SQL is also one less dialect to review in agent-written code. We measured the alternatives ([sources.md](sources.md#measurements)): every one adds to the student's `cargo install` (Diesel +10 s, SQLx +23 s, SeaORM +36 s); Diesel needed SQLite's `max()` and `strftime()` declared by hand, doubled the rebuild after an edit and printed 80 to 100 lines of trait errors for a type mistake; the async ones (SQLx, SeaORM, ormlite, welds, toasty) bring connection pools to one file behind a lock; welds' sync mode pins an older rusqlite; toasty has no migrations; ormx doesn't support SQLite. What we take instead: rows are read by column name, tables created or rebuilt from schema version 2 on are `STRICT`, every query runs in a store test, and each migration is tested from a frozen copy of the previous schema with rows in it. Revisit if the store grows to many related tables or needs queries built from optional filters.

## D20. The rail and one long belt (2026-09-26)

Navigation stays the tatami rail (icon over label, the rust edge). Revised the same day: the current page was first marked by the M2 notch, the edge growing into a tab beside it, tried in several shapes. It's now marked by its icon and label in the rust (`--sidebar-current`), and the edge stays a plain line (A2 on the design canvas, picked over A1, the ink label with the notch). The other structures sketched, a syllabus sidebar, the rail plus a class outline, and a belt path, were set aside; shadcn's `Sidebar` isn't used. The Roadmap shows progress as one long belt (P2): the eight belts joined in one strip, each as wide as its stripe count, with stripe bars, seals and a "You are here" mark. It was picked over ranked belt cards, a phase ladder and a stripe grid. Both are drawn on the design canvas, and the details are in [design.md](design.md#belts).

## D21. Code in VS Code's colors (2026-09-26)

Code used to be a dark slab in the app's own warm colors in both themes. It now looks like VS Code, where most students write minisql (D14): Light Modern in the light theme and Dark Modern in the dark, with the colors rust-analyzer gives Rust (control flow in purple, types in teal, functions and macros in yellow). RustRover's New UI colors were the other option; they mark more Rust detail (fields, lifetimes, italic doc comments), but several of their defaults miss WCAG AA (comments at 3.4:1 in light and 4.0:1 in dark) and would have needed changing. Both are on the design canvas, and the variables are in [design.md](design.md#code).

## D22. The frontend in web/, Rust in crates/ (2026-09-26)

The repository is split by language (L3 and R1 on the design canvas). The frontend is one Bun workspace package in `web/`, using React Router's default `app/` folder: routes in `app/routes/`, kept thin; one folder per feature in `app/features/`, with its components, logic and tests together; hooks shared by several features in `app/hooks/`; and only small helpers in `app/lib/`. The root is a Cargo workspace with its members in `crates/`, beside the shared folders (`content/`, `course/`, `dev/`, `docs/`) and the repository tooling, whose `package.json` runs `web/`'s scripts so every command works from the root. Before, the web app sat at the root in `src/`, with its features in `src/lib/`, so the first `src/` a Rust developer met was TypeScript. That mattered most here, since the course's contributors are Rust learners. Also considered: the same places with React Router's and shadcn's default names only (L2), and grouping React code by page (L4), set aside because progress and notes cross pages. On the Rust side, `oxido-core` stays its own crate rather than a module (R2), so its no-I/O rule stays enforced by its dependency list.

## D23. Translations by hand, with Claude's help (2026-09-27)

This replaces D5. The maintainer reads Portuguese natively and translates each lesson and quiz with Claude's help. Claude drafts from the English file, the [glossary](glossary-pt-BR.md) and the content rules in `CLAUDE.md`, and the maintainer reads and edits every line. When it can, the translation goes in the same PR as the English lesson, and it's reviewed like any other content.

D5's build-time pipeline was set aside. It would have parsed the Markdown, hidden code behind placeholders and cached paragraphs, and for one extra language, 44 lessons and 10 quizzes, that costs more to build and maintain than it saves. The hard part of translating this course is the choices: which terms stay in English, the tone, and staying faithful to what Bogdan says. A person makes those better, with the video in mind. Two automated checks keep what the pipeline would have guaranteed (P9):

- Every translation has the same shape as its English file: the same paragraph and quiz IDs, the same inline code, and code blocks that are identical except for comments.
- Each translation records a fingerprint of the English file it was made from, so CI warns when the English changes.

Also considered were a small translation model shipped with `oxido` and a hook for the student's own AI provider. Both were set aside to keep AI out of the app. If more languages or contributors arrive, a pipeline can still be added on top of the same checks.

## D24. Lessons drafted with an agent skill, from a committed outline (2026-09-27)

Each lesson is drafted with the `lesson` skill (`.agents/skills/lesson/`), one class per run, in an agent session on the maintainer's machine, where the transcripts are. The skill first writes an outline of the video: Bogdan's points in order, in new words, with timestamps, notes on anything he gets wrong, his asides (jokes, reactions, how he frames a point, as `Aside:` lines, so the writers get his personality without the transcript), and the Rust features the video introduces. Then it writes the lesson from the outline. Both are committed, the outline in `content/outlines/`, and reviewed in one PR. The outline is what the lesson gets checked against: the Claude review in CI never sees the transcript, so without it nothing after the local session could check that a lesson follows the video. The skill's `scripts/transcript-overlap.ts` flags any run of 8 or more words that the outline or the lesson shares with the transcript.

A merged lesson is never regenerated. The lesson records a fingerprint of its outline; when the outline changes, the content compiler (P1) flags the lesson as stale, and the skill proposes edits for the maintainer to approve.

Set aside: a script that sends each transcript and the course instructions to the Anthropic API, or to a headless agent, for all 44 lessons at once. It would copy the rules in `CLAUDE.md` into a prompt that drifts from them, need an API key, and turn out 44 drafts the maintainer would still read line by line, the same trade-off D23 weighed for translations. A GitHub Action can't do it at all: YouTube blocks requests from cloud servers, and the transcripts are git-ignored. The skill follows the Agent Skills format, so Claude Code (through a symlink in `.claude/skills/`), Codex, Gemini CLI, Cursor and VS Code can all run it.

## D25. Transcripts come from a Python script, run once (2026-09-27)

`scripts/fetch_transcripts.py` fetches the playlist and the transcripts with youtube-transcript-api and yt-dlp, run by uv. It runs once, again only to finish after YouTube blocks it partway: the videos are published and won't change, so neither will their transcripts. Revised the same day: at first the script was to get a Rust entry point, `cargo xtask update-course`, that fetched again and reported playlist changes and outlines written from an older transcript. That was dropped, since nothing it watched is expected to change. If the course ever follows a new playlist, running the script again and comparing its `playlist.json` with `course.toml` by hand is enough.

Set aside:

- Embedding the Python libraries with PyO3. It links libpython into the build, so every crate in the workspace, and every CI job that builds them, would need Python's development files, and the packages would still need an environment to import from. uv already handles that in one line.
- Putting the command in `oxido`. Students install it and never fetch transcripts, and linking Python would break `cargo install` on machines without it.
- Porting the fetching to Rust. YouTube's undocumented API changes often, the Python libraries get the fixes first, and the Rust crates lag behind: the most used one had its last release in June 2025.

## D26. The content compiler: its own crate, run on every build, TOML front matter (2026-09-27)

The content compiler is `crates/oxido-content`, a library that does no I/O, like `oxido-core`: `course.toml`, lessons, quizzes and outlines go in as text, and the JSON and lesson HTML the frontend reads come out, with every problem reported as a file, a line and a message. It's a crate of its own because it pulls in markdown-rs and arborium's tree-sitter grammars, which the students' `cargo install oxido` shouldn't have to compile; `oxido` gets the lessons through the frontend build it embeds. `crates/xtask`, never published, does the file and process work: `cargo xtask content` and `check-code`.

The compiled content isn't committed. `bun run build` and `bun run dev` run `cargo xtask content` first, into the git-ignored `web/.content/`, so CI's frontend job and the Pages build install Rust. Committing the output would have kept Pages on Bun alone, but every content PR would carry generated files and need a check that they're current.

Lessons, outlines and translations start with TOML front matter between `+++` lines, the format `course.toml` already uses. YAML would have added a second format and a parser (serde_yaml is no longer maintained).

Lessons and quizzes that `course.toml` plans but that aren't written yet are listed on every build, not treated as errors, so the course can be written one PR at a time; `cargo xtask content --complete` makes them errors for a release. A quiz file that no phase uses is always an error, which catches a typo in a quiz's name.

## D27. Two long-lived branches: develop and main (2026-09-30)

Work lands on `develop`, the default branch, through squash-merged PRs. release-please runs there too: its release PR is merged into `develop`, and the release is tagged there. After each release, `develop` is merged into `main` with a merge commit. The website deploys from `main`, so it only shows what has been released.

Each branch allows one merge method, so the merge button can't be used the wrong way. `develop` takes squashes only, and every PR lands as one commit. `main` takes merge commits only, which keeps it connected to `develop`: each merge from `develop` then carries only what's new since the last one.

Until now `main` was the only long-lived branch. Also considered: running release-please on `main`, so an urgent fix could go straight to `main` without the unreleased work on `develop`. That needs a merge from `main` back into `develop` after every release, as a merge commit, so `develop` would have to allow merge commits too, and any PR into it could land as all of its commits by mistake. Before 1.0, shipping a fix together with the rest of `develop` costs less.

## D28. Lessons drafted as a tournament (2026-10-02)

The `lesson` skill drafts each lesson as a tournament, once its outline is written. Three writer agents draft the lesson from the outline alone, each with a different aim: the leanest lesson that still sounds like him, the closest to how he talks, and the closest to how he demonstrates. They never see the transcript, the session or an earlier version of the lesson. A gate then checks each draft: the `avoid-ai-writing` skill in detect mode, the transcript-overlap script, and `cargo xtask content` with `check-code`. Three judges rank the drafts without knowing who wrote which: one for voice (how well it teaches the way Bogdan does, in the course's own register, against the skill's voice sheet), one for fidelity to the outline (every point, in order, nothing added), and one that plays a beginner and follows each draft literally. Fidelity is a gate; among the drafts that pass it, the voice judge's top draft wins, since lessons kept reading like a careful engineer's tutorial rather than like him. The winner gets the judges' fixes and a pass of the `humanizer` skill, with the voice sheet's sample as its writing sample so it matches his voice instead of going neutral, and `avoid-ai-writing`'s mechanical check confirms that the pass left code and structure alone. Both are third-party skills (MIT), kept whole in `.agents/skills/` with their licenses and copied unchanged, so they can be updated from upstream. The `lesson` skill's instructions name them; none of its scripts load their files (`tooling.test.ts` checks). D24 still holds: the outline comes first, and a merged lesson is never regenerated.

Why: one agent drafting alone grades its own work. On lesson 1, its drafts drifted toward the book's tone and toward earlier drafts it had seen. Three drafts written from scratch give the maintainer real alternatives, and blind judges catch what a writer misses in its own text. It costs about seven agent runs per lesson instead of one; the skill's quick mode (one draft, the gate and the polish) is there when that isn't worth it.

The tournament came from a separate, general skill for project-based coding courses, folded into the `lesson` skill so drafting has one set of rules. Its teaching template (predict-the-output prompts, tracing questions, Parsons problems, exercises and retrieval questions) was cut: a lesson is the video in text form, and those activities belong in the quizzes and the build steps.

## D29. The official book is the model for the lessons' content and register (2026-10-07)

Bogdan's videos are tied to the official book more closely than to any other version: he follows its chapters in order and demonstrates its own examples on screen (`first_word`, `Rectangle`, the `Summary` trait with `Tweet` and `NewsArticle`, `longest`, the cons list, the blog post), teaches through the compiler errors it shows, and draws the diagrams it draws. Even his ownership video expands the book's own framing: garbage collection, managing memory yourself, and Rust's "third approach". What he adds is delivery: the live demo, pros-and-cons tables, an occasional example of his own, and jokes. So the official book is the model for a lesson's facts, terms, order, examples and framing, and its register, friendly and direct with "we" and "let's", is the register lessons write in: a notch more formal than his speech, in the course's own voice rather than a copy of his.

Considered, and given smaller roles or none:

- **Jason Walton's abridged version** keeps the book's examples and stays the model for length, but it leans on comparisons with other languages (C, Java, JavaScript, Go, Python), which Bogdan rarely makes.
- **Comprehensive Rust**, Google's course for developers, shares his method (live code, compiler errors as teaching material) but follows its own order and examples and compares Rust with C++ and Java throughout. It's a fallback for phrasing a point when the book's explanation is heavy going. An earlier version of this decision, made the same day and never merged, made it the model for phrasing and ownership; checking the videos against all four sources showed the book is closer.
- **The Brown University version** shares the book's examples, but its chapter 4 reframes ownership around undefined behavior and read, write and own permissions, which he never uses. The lesson skill named it as the model for ownership before; that choice wasn't recorded here. It's no longer used for drafting.

## D30. The rail on phones: a tab bar along the bottom (2026-10-07)

The rail (D20) is drawn for wide screens, and at 92px it would take a quarter of a phone's width. Below Tailwind's `md` breakpoint, its items move to a tab bar along the bottom instead: the same links, icon over label, with the rust edge along the bar's top. The logo and the theme toggle sit in a bar above the page. Only one of the two navigations shows at a time, and the hidden one is out of the accessibility tree.

Also considered: a top bar with a menu button that opens a sheet with the items. It keeps the page taller, but every move to another page takes an extra tap.
