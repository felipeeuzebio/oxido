# Testing

The project is built test first (see the TDD rule in [roadmap-platform.md](roadmap-platform.md)). Write the test, watch it fail for the right reason, then write the code.

## Tools

| Layer | Tool | Where | Run |
|---|---|---|---|
| Rust logic | `cargo test` (CI uses cargo-nextest) | `crates/*/src` (unit), `crates/*/tests` (integration) | `cargo test --workspace` |
| Server store and HTTP | `cargo test`, with in-memory SQLite and `tower`'s `oneshot` (no network) | `crates/oxido/tests/` | `cargo test -p oxido` |
| Repository rules | Vitest in a Node environment | `*.test.ts` at the root: `commitlint.config.test.ts` (commit rules), `tooling.test.ts` (workflows and hooks) | `bun run test` |
| Rust snapshots | insta, from P1 | content compiler and parser output | `cargo insta review` |
| Frontend logic and components | Vitest + React Testing Library (jsdom) | `src/**/*.test.{ts,tsx}` next to the code | `bun run test` |
| Theme guards | Vitest reading source files | `src/lib/theme/tokens.test.ts`, `raw-colors.test.ts` | `bun run test` |
| Types | TypeScript 7 (`tsc`, after React Router's typegen) | whole frontend | `bun run check` |
| End to end | Playwright against the real `oxido` binary serving the production build | `e2e/` | `bun run test:e2e` |
| Lint and format | Biome (TS, JSX, JSON, CSS; React rules on), rustfmt, clippy | everything | `bun run lint`, `cargo clippy --workspace` |
| Course project | stripe test suites, from P8 | `course/minisql/` | CI job |

## Rules

- Put logic in plain functions and plain Rust crates. `oxido-core` does no I/O, `oxido` keeps its handlers thin over a tested store, and frontend logic lives in `.ts` files that components import. That keeps most tests fast and free of UI setup.
- Server tests never open a port: they build the router with an in-memory store and in-memory UI files (`MemoryAssets`) and send requests with `oneshot`. The real port, cookie and browser behavior are covered once in `e2e/session.test.ts`.
- Fixtures come from real output where possible. `crates/oxido-core/tests/fixtures/` holds clippy JSON captured from a real crate, with paths normalized to `/workspace`.
- Every store query runs in at least one store test (there's no ORM to check SQL at compile time, decision D19). Each migration has a test that starts from a frozen copy of the previous schema, `crates/oxido/tests/fixtures/schema-N.sql`, with rows in it.
- Test names describe behavior (`a_stripe_remembers_when_it_first_passed`), not functions.
- A bug fix starts with a test that reproduces the bug.
- Don't test framework behavior (that React renders, that serde parses JSON).

## Running Playwright locally

`bunx playwright install chromium` once. If a Chromium is already installed elsewhere, point at it instead:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome bun run test:e2e
```

The Playwright config builds the frontend, then starts `cargo run -p oxido -- serve --port 4173 --no-open` with a fixed `OXIDO_TOKEN` and a throwaway project (an `oxido.toml` in `target/e2e-project`). The first run compiles `oxido`, so allow a minute.

## Before pushing

The pre-push hook runs the Rust tests and clippy for the whole workspace, Vitest and the type check. CI runs everything, including Playwright.
