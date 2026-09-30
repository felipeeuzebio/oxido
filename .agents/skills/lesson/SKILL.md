---
name: lesson
description: Draft or update one Oxidō text lesson from its Let's Get Rusty video. Writes an outline of Bogdan's points in new words first, then the lesson from that outline, and checks both for wording copied from the transcript. Use when writing, revising or checking the lesson for a class, e.g. "lesson 12" or "write the lesson for the ownership video".
---

# Draft a lesson

Each class is one of Bogdan's videos plus a text lesson that teaches the same points in the same order, in new words (decision D6). This skill drafts that lesson in two steps: an outline of what the video teaches, then the lesson written from the outline. The maintainer reviews both in one PR; the outline is what the lesson gets checked against, since the transcript never leaves the maintainer's machine (decision D24).

The class is given as its position in the playlist (`12`) or the video's title. One class per run. Quizzes and build steps aren't part of this skill.

## Read first

1. `CLAUDE.md`, especially "Content rules". They override anything here.
2. `docs/roadmap-course.md`: "Class format", "Content format" (file names, front matter, the Markdown lessons can use), and the phase this video belongs to.
3. `content/course.toml`: the phase and chapters for this video.
4. The outlines in `content/outlines/` for earlier videos. Their "Introduces" lists say which Rust features students know so far. Skim one or two earlier lessons for tone and depth.
5. The transcript: `transcripts/NN_<videoId>.md`. If it's missing, run `uv run scripts/fetch_transcripts.py`, which downloads the ones not there yet. It needs network access and YouTube sometimes blocks it; if it fails, stop and tell the maintainer.
   The transcripts are YouTube's automatic captions, which often mishear Rust words (`impl`, `&mut`, crate names). When a line doesn't make sense, check the video before it goes into the outline.

## New lesson or update?

If `content/outlines/NN-*.md` already exists, this is an update. The maintainer has edited and approved those files, so never rewrite them from scratch:

- `cargo xtask content` warns about each lesson whose outline changed after it was written, with the fingerprint to record once the lesson follows the outline again.
- Propose specific edits as a diff, say why each one is needed, and wait for the maintainer before applying them.

## Step 1: the outline

Write `content/outlines/NN-<slug>.md`, with the playlist position and a short slug from the video title:

```markdown
+++
video = "<videoId>"
title = "<the video's title>"
+++

1. [mm:ss] <one point Bogdan makes, in your own words>
2. [mm:ss] <the next point, in the order he makes it>
   - Note: <only if he says something wrong or since changed: what he claims, and what's true now>
3. [mm:ss] Demo: <what his example shows, described, never copied>

## Introduces

- <each Rust feature or tool this video teaches for the first time, e.g. `&mut`, `cargo test`>
```

- One line per point, in the video's order, with the time he makes it. Cover every point he teaches, including asides that teach something.
- Record his claims as he states them, mistakes included. Flag a mistake with a `Note:` line under the point; don't fix the point itself.
- Describe his code; don't reproduce it.
- No quotes. The outline is in new words like the lesson, and it's committed.

## Step 2: the lesson

Write the lesson from the outline, not from the transcript. Go back to the transcript only to settle what he meant.

- Write it to `content/en/<phase>/NN-<slug>.md`, named like its outline, in the format "Content format" describes. Set `outline` last, once the outline is final: `sha256:` and the outline file's SHA-256 (`sha256sum <file>`, or `shasum -a 256` on macOS).
- Cover every outline point, in the outline's order. Keep his claims as he states them. A correction is a clearly marked note right after his point, never a replacement for it.
- Use new, real-world code examples: not his, and not the Rust Book's, and only Rust that this video or earlier ones introduce.
- Write plain, direct sentences, as in the rest of the course.

## Step 3: checks

1. Run the prose through the Humanizer skill if your agent has it. If it doesn't, reread the lesson for these AI tells and rewrite each one: "not X but Y" contrasts, one-line closing zingers, staged openers ("Here's the thing:"), lists forced into threes, dashes everywhere, inflated or salesy claims, stock words ("delve", "robust", "seamless"), bold labels starting paragraphs, and filler.
2. Check for wording copied from the transcript with this skill's `scripts/transcript-overlap.ts`, and rewrite every run it reports until it reports none. From the repository root:

   ```sh
   bun .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/NN_<videoId>.md content/outlines/NN-<slug>.md <lesson file>
   ```

3. Run `cargo xtask content` and `cargo xtask check-code`, and fix what they report.

## Hand off to the maintainer

Print a review list and stop:

- Each outline point with its `[mm:ss]`, next to the lesson section that covers it, so the maintainer can check the order against the video.
- Every `Note:` in the outline and every marked note in the lesson.
- The overlap check's result.
- Any Rust in the examples that isn't in an "Introduces" list so far. There should be none.

Commit and open the PR only when the maintainer says to, following `.github/commit-instructions.md` (`feat(content): add lesson <n> on <topic>`) and `.github/pr-instructions.md`. Commits, PRs and review comments are public, so never quote the transcript in them. Once the English lesson is approved, offer to draft the pt-BR translation, following the translation rules in `CLAUDE.md` and `docs/glossary-pt-BR.md`.
