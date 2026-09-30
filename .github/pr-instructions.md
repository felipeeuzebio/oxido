# Pull request instructions

How to write the title and description of a pull request in this repository. The rules come from `CLAUDE.md`, `docs/conventions.md`, `docs/workflows.md` and `.github/pull_request_template.md`.

## How a PR lands

- `main` only takes pull requests, and they are squash-merged. The PR title becomes the single commit on `main`, and release-please builds the version and changelog from it.
- CI lints the title with commitlint, and that check is required to merge.
- Claude reviews every PR that isn't a draft, against `CLAUDE.md`, `docs/testing.md` and `docs/conventions.md`. The description is the first thing the reviewer reads.
- Branches are named `<type>/<short-description>`, e.g. `feat/quiz-page`, `fix/notes-anchor`.

## Title

- Use the commit header format from `.github/commit-instructions.md`: `<type>(<scope>): <summary>`, with a type and scope from its tables, a lower-case imperative summary, no period, 72 characters or fewer.
- Describe the whole PR, not its last commit. Pick the type by the change's effect on students or contributors: a PR that adds a feature with its tests and docs is `feat`, not `test` or `docs`.

## Description

Follow the template and keep its three sections and checkboxes in order.

### What and why

One or two sentences on what changes and why. End with the roadmap phase or issue: "Part of P5 (quizzes), closes #12". Leave the phase out only when the PR belongs to none (a dependency bump, a CI fix).

| Phase | Covers |
|---|---|
| P0 | Foundation (done) |
| P1 | Content pipeline |
| P2 | Roadmap home and navigation |
| P3 | Lesson page |
| P4 | Progress tracking |
| P5 | Quizzes |
| P6 | Notes |
| P7 | Quiz code editor |
| P8 | Build steps and stripe tests |
| P9 | Translations (en, pt-BR) |
| P10 | Content production |
| P11 | Version 1.0 |

Add a short paragraph after it for each of these that applies. Reviewers send the PR back when one is missing.

- **New runtime dependency.** Name it and say why the app needs it. The app is meant to stay light, so heavy parts (the quiz editor, the video player) are lazy-loaded.
- **New `/api` route, header, or process that `oxido` runs.** Name its test in `crates/oxido/tests/http.rs` and say in one line why it's safe: the session, origin and host checks still apply.
- **A decision in `docs/decisions.md` changes.** Say so explicitly, name the decision (`D12`) and what replaces it.
- **Breaking change.** Say what breaks and what users or contributors do about it.
- **Docs.** Name the docs updated with the change.
- **Lesson.** Name the video it follows and its outline in `content/outlines/`. Say that it teaches the outline's points in the same order, that any correction is a clearly marked note after the point, and that it copies no transcript text.
- **Translation.** Say which English file it follows and list any terms added to `docs/glossary-pt-BR.md`.

### Tests first

Under the checkboxes, name the tests that cover the change (test names or files), and the "Done when" line of the phase they check, if any. For a PR with no behavior change (docs, refactor, CI), say so and name what still covers it.

### Checklist

Keep every item, including those that don't apply to this PR.

## Checkboxes

Leave every checkbox unticked. Each one is the author's own statement ("I wrote...", "I read the whole translation"), and the author ticks it after checking.

## Style

- Plain, direct sentences. No marketing words, emoji or extra headings.
- Don't walk through the diff file by file; the reviewer has the diff.
- Don't claim anything the diff doesn't show: no test results, benchmarks or manual checks you didn't see.
- release-please and Dependabot title their own PRs (`chore(release): release x.y.z`, `chore(deps): bump ...`). Don't rewrite those titles.

## Example

```
feat(quiz): reveal the correct answer on the results page
```

```markdown
## What and why

The results page only said whether each answer was right, so a student who
missed a question had no way to learn from it. It now shows the correct
answer under each wrong one. Part of P5 (quizzes), closes #12.

`docs/design.md` describes the new answer row.

## Tests first

- [ ] I wrote or updated tests before the implementation, and they failed without it
- [ ] `cargo test`, `bun run test` and `bun run check` pass locally

Covered by "shows the correct answer under a wrong one" in
`web/app/features/quiz/results.test.tsx`.

## Checklist

- [ ] Docs updated (`docs/`, `CLAUDE.md`) if behavior or structure changed
- [ ] For content changes: the text lesson follows the video's teachings in order and copies no transcript text
- [ ] For translations: I read the whole translation, and any new term is in the glossary
```
