import { describe, expect, it } from "vitest";
import { copiedRuns } from "../.agents/skills/lesson/scripts/transcript-overlap";

// A transcript as scripts/fetch_transcripts.py writes it: a title, the video
// link, then one timestamped snippet per line, often cut mid-sentence.
const transcript = [
  "# 12. References and Borrowing",
  "",
  "<https://www.youtube.com/watch?v=abc123>",
  "",
  "[00:01] so the borrow checker makes sure that",
  "[00:03] every reference points to valid memory at all times",
  "[00:07] and a string slice is a reference to part of a string",
].join("\n");

describe("copiedRuns", () => {
  it("finds a sentence copied from the transcript, across snippet lines and timestamps", () => {
    const lesson =
      "The compiler's borrow checker makes sure that every reference points to valid memory at all times.";
    expect(copiedRuns(transcript, lesson)).toEqual([
      "borrow checker makes sure that every reference points to valid memory at all times",
    ]);
  });

  it("ignores case and punctuation", () => {
    const lesson = "A String slice is, in short: a reference to part of a String!";
    expect(copiedRuns(transcript, lesson, 6)).toEqual(["a reference to part of a string"]);
  });

  it("reports nothing for text written in new words", () => {
    const lesson =
      "Rust checks every borrow at compile time. A slice points into part of a String you already own.";
    expect(copiedRuns(transcript, lesson)).toEqual([]);
  });

  it("skips front matter and code blocks, where exact matches are expected", () => {
    const lesson = [
      "---",
      "title: every reference points to valid memory at all times",
      "---",
      "",
      "```rust",
      "// so the borrow checker makes sure that every reference points to valid memory",
      "```",
    ].join("\n");
    expect(copiedRuns(transcript, lesson)).toEqual([]);
  });

  it("skips TOML front matter between +++ lines, as lessons and outlines use", () => {
    const lesson = [
      "+++",
      'title = "every reference points to valid memory at all times"',
      "+++",
      "",
      "Rust checks every borrow at compile time.",
    ].join("\n");
    expect(copiedRuns(transcript, lesson)).toEqual([]);
  });

  it("allows short shared phrases: a run needs 8 words by default", () => {
    const seven = "Remember: every reference points to valid memory at compile time.";
    expect(copiedRuns(transcript, seven)).toEqual([]);
    const eight = "Remember: every reference points to valid memory at all hours.";
    expect(copiedRuns(transcript, eight)).toEqual([
      "every reference points to valid memory at all",
    ]);
  });
});
