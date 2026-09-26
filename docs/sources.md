# Sources

References used to plan and build oxido. Checked in September 2026. When a decision depends on one of these, link it from the PR or doc that makes the decision.

## Course material

- Let's Get Rusty, "The Rust Lang Book" playlist (44 videos): https://www.youtube.com/playlist?list=PLai5B987bZ9CoVR-QEIN9foz4QCJ0H2Y8
- *The Rust Programming Language* by Steve Klabnik, Carol Nichols and the Rust community (MIT or Apache-2.0): https://doc.rust-lang.org/book/
- mdbook-quiz, quiz format with MultipleChoice, ShortAnswer and Tracing questions: https://github.com/cognitive-engineering-lab/mdbook-quiz

## Project inspiration (Mini SQL)

- Connor Stack, "Let's Build a Simple Database" (cstack/db_tutorial): https://github.com/cstack/db_tutorial
- *500 Lines or Less*, "DBDB: Dog Bed Database": https://github.com/aosabook/500lines
- PingCAP talent-plan, key-value store course in Rust (pacing reference): https://github.com/pingcap/talent-plan
- Other candidates considered: Ray Tracing in One Weekend, micrograd, Crafting Interpreters, karan/Projects. See [decisions.md](decisions.md).

## Platform

- Vite 8 (Rolldown, Oxc, Lightning CSS): https://vite.dev/blog/announcing-vite8
- React Compiler with @vitejs/plugin-react v6 (via @rolldown/plugin-babel): https://recca0120.github.io/en/2026/04/14/react-compiler-vite-v6/
- React Router pre-rendering with `ssr: false`: https://reactrouter.com/how-to/pre-rendering (known issue with a base path: https://github.com/remix-run/react-router/issues/13615)
- Next.js static export limits (why not Next.js): https://nextjs.org/docs/app/guides/static-exports
- TypeScript 7 (native compiler): https://www.infoq.com/news/2026/08/typescript-7-released/
- Oxlint type-aware linting, considered as an alternative to Biome: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable
- Biome 2026 roadmap: https://biomejs.dev/blog/roadmap-2026/
- markdown-rs (lesson Markdown, P1): https://github.com/wooorm/markdown-rs
- arborium (build-time code highlighting, P1): https://fasterthanli.me/articles/introducing-arborium
- libtest JSON output is still nightly-only (2026 project goal): https://goals.rust-lang.org/2026/libtest-json.html
- cargo-dist (prebuilt binaries, P11): https://github.com/axodotdev/cargo-dist/releases
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Simon Willison, fixing YouTube Error 153 (embeds need a referrer): https://til.simonwillison.net/youtube/fixing-153-embed
- YouTube API Services, Required Minimum Functionality (no overlays in front of an embedded player, 200×200 minimum): https://developers.google.com/youtube/terms/required-minimum-functionality
- Video.js v10 release candidate (2026-09-09): https://videojs.org/blog/videojs-v10-release-candidate; its YouTube package at rc.3: https://github.com/videojs/v10/releases/tag/%40videojs/youtube-video%4010.0.0-rc.3
- react-player (now maintained by Mux): https://github.com/cookpete/react-player
- Kibo UI video player (media-chrome): https://www.kibo-ui.com/components/video-player
- CodeMirror: https://codemirror.net
- Rust Playground: https://github.com/rust-lang/rust-playground (endpoint list: https://github.com/kingananas20/playground-api)
- Cargo JSON message format: https://doc.rust-lang.org/cargo/reference/external-tools.html#json-messages

## Repository tooling

- Claude Code GitHub Action (PR review example): https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md
- release-please action: https://github.com/googleapis/release-please-action
- lefthook: https://lefthook.dev
- commitlint: https://commitlint.js.org
- Conventional Commits: https://www.conventionalcommits.org

## Hosting

- GitHub Pages limits (1 GB site, soft 100 GB/month, no commercial use): https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Workers static assets (free, unlimited static requests): https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Vercel Hobby plan (non-commercial only): https://vercel.com/docs/plans/hobby

## Measurements

- `cargo clippy --message-format=json` on a small crate: 2.5 s on the first run, about 0.1 s for re-checks after an edit (measured September 2026, Linux container, Rust 1.95).
- Memory, matching Svelte 5 and React 19 pages in headless Chromium: 1.8 MB vs 2.4 MB of JavaScript heap on a small page, 3.6 MB vs 3.4 MB with 2,000 paragraphs; the whole browser used about 298 MB either way (278 MB empty).
- Memory of a minimal static server after 800 requests: Rust (axum) 4 MB, Go 10 MB, Bun 42 MB, Node 71 MB. The Rust release binary was 1.3 MB and took 33 s to build from scratch.
- Database libraries for `oxido`: time for a clean `cargo build --release` with `oxido`'s release settings (LTO, one codegen unit), dependencies only, on a 2-core Linux container with Rust 1.95 (September 2026). rusqlite 0.40 (today): 57 s, 135 crates. Diesel 2.3: 67 s, 148. welds 0.5 in sync mode (on rusqlite 0.32): 66 s, 147. SQLx 0.9: 80 s, 171. welds 0.5 async (SQLx 0.9): 89 s, 175. toasty 0.11: 92 s, 169. SeaORM 2.0: 93 s, 220. ormlite 0.24 (SQLx 0.8): 124 s, 203. ormx 0.11 doesn't build with SQLite ("sqlite is currently not supported").
- The same five store functions (quiz upsert, add, list and soft-delete notes) in rusqlite and in Diesel 2.3: 77 vs 111 lines; rebuild after a one-line edit 0.18 s vs 0.39 s; `cargo check` 0.07 s vs 0.18 s. A misspelled column is a 16-line compile error in Diesel and a `no such column` error on the first test run with rusqlite; comparing a text column with a number, or reading a `BigInt` column into an `i32`, gave 81 and 98 lines of trait errors in Diesel.
- `oxido` release build from scratch on a 2-core Linux container (September 2026, Rust 1.95): 92 s and a 3.6 MB binary with our `[profile.release]`, 102 s and 7.3 MB with Rust's defaults. A crate packaged from a workspace member doesn't carry the workspace's profile: installing it built with `opt-level=3` and no LTO.
