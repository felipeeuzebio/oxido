import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copiedRuns } from "../.agents/skills/lesson/scripts/copied-runs";

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

// The command runs on the maintainer's machine, under any Node that strips
// TypeScript types. It has no entry-point check, so it can't load and exit 0
// without checking, which would read as "nothing copied". A Node that can't
// run TypeScript stops with an error instead; CI's may be one, so these skip there.
describe.skipIf(!process.features.typescript)("the transcript-overlap command", () => {
  const dir = mkdtempSync(join(tmpdir(), "overlap-"));
  const file = (name: string, text: string) => {
    writeFileSync(join(dir, name), text);
    return join(dir, name);
  };
  const transcriptFile = file("transcript.md", transcript);
  const run = (script: string, ...files: string[]) =>
    spawnSync(process.execPath, [script, transcriptFile, ...files], { encoding: "utf8" });

  it.each([
    ".agents/skills/lesson/scripts/transcript-overlap.ts",
    ".claude/skills/lesson/scripts/transcript-overlap.ts",
  ])("names each copied run and exits 1, run as %s", (script) => {
    const copied = file(
      "copied.md",
      "So the borrow checker makes sure that every reference points to valid memory.",
    );
    const result = run(script, copied);
    expect(result.stdout).toContain(
      `${copied}: "so the borrow checker makes sure that every reference points to valid memory"`,
    );
    expect(result.status).toBe(1);
  });

  it("says so and exits 0 when nothing is copied", () => {
    const fresh = file("fresh.md", "Rust checks every borrow at compile time.");
    const result = run(".agents/skills/lesson/scripts/transcript-overlap.ts", fresh);
    expect(result.stdout).toContain("No wording shared with the transcript.");
    expect(result.status).toBe(0);
  });
});
