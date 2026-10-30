import { describe, expect, it } from "vitest";
import { filled, segmentAt, segments } from "./chapter-bar";

// Lesson 1's first chapters, in a 7:10 video.
const CHAPTERS = [
  { title: "Getting started", start: 28 },
  { title: "Install Rust", start: 52 },
  { title: "Cargo", start: 234 },
];

describe("segments", () => {
  it("runs each chapter to the next, the first from the beginning and the last to the end", () => {
    expect(segments(CHAPTERS, 430, "Getting started")).toEqual([
      { title: "Getting started", start: 28, from: 0, to: 52 },
      { title: "Install Rust", start: 52, from: 52, to: 234 },
      { title: "Cargo", start: 234, from: 234, to: 430 },
    ]);
  });

  it("is one segment for the whole video when there are no chapters", () => {
    expect(segments([], 430, "Getting started")).toEqual([
      { title: "Getting started", start: 0, from: 0, to: 430 },
    ]);
  });
});

describe("filled", () => {
  const [opening, install, cargo] = segments(CHAPTERS, 430, "Getting started");

  it("is how much of a segment has played", () => {
    expect(filled(opening, 143)).toBe(1);
    expect(filled(install, 143)).toBe(0.5);
    expect(filled(cargo, 143)).toBe(0);
  });
});

describe("segmentAt", () => {
  const all = segments(CHAPTERS, 430, "Getting started");

  it("finds the segment a moment falls in, the last one holding the very end", () => {
    expect(segmentAt(all, 0)?.title).toBe("Getting started");
    expect(segmentAt(all, 52)?.title).toBe("Install Rust");
    expect(segmentAt(all, 430)?.title).toBe("Cargo");
  });
});
