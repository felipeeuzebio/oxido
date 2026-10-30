---
name: lesson
description: Write or update the outline of one Oxidō class from its Let's Get Rusty video. The outline lists Bogdan's points in order and in new words, with their times, the video's chapters, his notes and asides, and the Rust features it introduces, and it's checked for wording copied from the transcript. Use when outlining a class or checking its outline, e.g. "lesson 12", "outline the ownership video" or "check the outline for lesson 1".
---

# Outline a class

Each class is one of Bogdan's videos followed by a task that puts it to use (decision D35). The outline is the class's record of the video: his points in order, in new words, with the time he makes each one (decision D24). It's committed and reviewed with the class, and the rest of the class is checked against it, since the transcript never leaves the maintainer's machine:

- Its chapters are the ones the strip under the player shows, and the brief's hints (`[text](video:4)`) take their times from its points.
- Its "Introduces" list, with those of the outlines before it, says what the class's task may use.
- Its notes say where the video is wrong or out of date, which the brief has to mark.

The class is given as its position in the playlist (`12`) or the video's title. One class per run. Briefs, quizzes, drills and stripe tests aren't part of this skill.

## Read first

1. `CLAUDE.md`, especially "Content rules". They override anything here.
2. `docs/roadmap-course.md`: "Class format", "Content format" (file names and front matter), and the phase this video belongs to.
3. `content/course.toml`: the phase and chapters for this video.
4. The outlines in `content/outlines/` for earlier videos, for their level of detail and their "Introduces" lists.
5. The transcript: `transcripts/NN_<videoId>.md`. If it's missing, run `uv run scripts/fetch_transcripts.py`, which downloads the ones not there yet. It needs network access and YouTube sometimes blocks it; if it fails, stop and tell the maintainer.
   The transcripts are YouTube's automatic captions, which often mishear Rust words (`impl`, `&mut`, crate names). When a line doesn't make sense, check the video before it goes into the outline.
6. The chapter of [*The Rust Programming Language*](https://doc.rust-lang.org/book/) the video covers. He follows the book chapter by chapter and demonstrates its examples, so when the transcript is unclear, the book settles what he meant. Take its terms, never its sentences.

## New outline or update?

If `content/outlines/NN-*.md` already exists, this is an update. The maintainer has edited and approved it, so never rewrite it from scratch: propose specific edits as a diff, say why each one is needed, and wait for the maintainer before applying them. Once an edit is in, `cargo xtask content` warns that the class's file was written from an older outline, with the fingerprint to record once its brief has been checked against the new one.

## Write the outline

Write `content/outlines/NN-<slug>.md`, with the playlist position and a short slug from the video title:

```markdown
+++
video = "<videoId>"
title = "<the video's title>"
duration = "<m:ss>"
chapters = [
  { point = 1, title = "<the video's first part, from the start>" },
  { point = <n>, title = "<each part where he moves to a new topic>" },
]
+++

1. [mm:ss] <one point Bogdan makes, in your own words>
2. [mm:ss] <the next point, in the order he makes it>
   - Note: <only if he says something wrong or since changed: what he claims, and what's true now>
   - Aside: <a joke, reaction or framing of his at this point, in your own words>
3. [mm:ss] Demo: <what his example shows, described, never copied>

## Introduces

- <each Rust feature or tool this video teaches for the first time, e.g. `&mut`, `cargo test`>
```

- One line per point, in the video's order, with the time he makes it, read from the transcript's timings. Cover every point he teaches, including asides that teach something. `duration` is the video's length, the transcript JSON's `duration` in m:ss. The compiler checks that the times follow the video and end before it does, and the chapters and the brief's `video:N` hints take their times from these points, so get them right.
- `chapters` are the video's parts, each starting at the point where he moves to a new topic. The strip under the player shows them the way YouTube shows chapters, so name each one for what a student would look for ("Install Rust", "Cargo"). The first starts at point 1.
- Record his claims as he states them, mistakes included. Flag a mistake, or a step that has changed since (an editor menu, which extension comes first), with a `Note:` line under the point; don't fix the point itself. The class's brief marks each one for the student.
- Record how he says it, too: each joke, reaction or framing that shows his personality ("luckily, Rust has this built in", a joke about putting Rust on your resume) goes in an `Aside:` line under its point, described in new words. Leave out channel talk (subscribe, see you next time). Whoever writes the class's brief and quiz never sees the transcript, so this is how his personality reaches them.
- Describe his code; don't reproduce it.
- No quotes. The outline is in new words, and it's committed.

## Check it

1. Check the outline for wording copied from the transcript, and rewrite every run it reports until it reports none.

   ```sh
   node .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/NN_<videoId>.md content/outlines/NN-<slug>.md
   ```

2. Run `cargo xtask content` and fix what it reports about the outline: the points' numbers and times, the video's length, the chapters.
3. If the class's file in `content/en/` already exists, set its `outline` to the outline's fingerprint once its brief follows the outline: `sha256:` and the file's SHA-256 (`sha256sum <file>`, or `shasum -a 256` on macOS).

## Hand off to the maintainer

Print a review list and stop:

- Each point with its `[mm:ss]`, and each chapter with the point it starts at, so the maintainer can check them against the video.
- Every `Note:` line.
- The "Introduces" list, and anything in it that an earlier outline already introduces.
- The overlap check's result.

Commit and open the PR only when the maintainer says to, following `.github/commit-instructions.md` (`feat(content): add the outline for class <n>`) and `.github/pr-instructions.md`. Commits, PRs and review comments are public, so never quote the transcript in them.

## Files

| File | What it's for |
| --- | --- |
| `scripts/transcript-overlap.ts` | "Check it": wording shared with the transcript. The matching itself is in `scripts/copied-runs.ts`, which the tests import |
