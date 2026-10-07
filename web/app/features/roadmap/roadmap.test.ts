import { describe, expect, it } from "vitest";
import golden from "../../../../crates/oxido-content/tests/golden/course.json";
import type { Course } from "../content/types";
import { chapterRange, roadmap } from "./roadmap";

// The compiler's fixture course: a kickoff, then the white belt (p01, two
// stripes and both lessons) and the yellow belt (p02, one stripe, no lessons).
const course: Course = golden;

describe("roadmap", () => {
  it("joins the belts end to end, each as long as its stripe count", () => {
    const { belts, earned, total } = roadmap(course);
    expect(belts.map((belt) => [belt.id, belt.name, belt.total])).toEqual([
      ["white", "White", 2],
      ["yellow", "Yellow", 1],
    ]);
    expect([earned, total]).toEqual([0, 3]);
  });

  it("starts at the first stripe of the first belt when nothing is earned", () => {
    const { belts, next, started } = roadmap(course);
    expect(started).toBe(false);
    expect(next).toEqual({
      belt: "white",
      phase: "p01",
      number: 1,
      of: 2,
      text: "a prompt that reads lines",
    });
    expect(belts.map((belt) => [belt.current, belt.stripes])).toEqual([
      [true, ["next", "open"]],
      [false, ["open"]],
    ]);
  });

  it("seals a belt once all of its stripes are earned, and moves on to the next", () => {
    const { belts, next, earned, started } = roadmap(course, { stripes: { p01: 2 } });
    expect(started).toBe(true);
    expect(earned).toBe(2);
    expect(belts.map((belt) => [belt.id, belt.earned, belt.sealed, belt.current])).toEqual([
      ["white", 2, true, false],
      ["yellow", 0, false, true],
    ]);
    expect(next).toMatchObject({ belt: "yellow", number: 1, of: 1, text: "rows" });
  });

  it("has no next stripe and no current belt once every stripe is earned", () => {
    const { belts, next, phases } = roadmap(course, { stripes: { p01: 2, p02: 1 } });
    expect(next).toBeNull();
    expect(belts.some((belt) => belt.current)).toBe(false);
    expect(phases.map((phase) => phase.status)).toEqual([null, "done", "done"]);
  });

  it("never counts more stripes than a phase has", () => {
    expect(roadmap(course, { stripes: { p01: 9, p02: -1 } }).earned).toBe(2);
  });

  it("numbers the phases and gives each its chapters and belt", () => {
    const { phases } = roadmap(course);
    expect(
      phases.map((phase) => [phase.id, phase.number, phase.chapters, phase.belt, phase.total]),
    ).toEqual([
      ["kickoff", null, "", null, 0],
      ["p01", 1, "1, 3", "white", 2],
      ["p02", 2, "4", "yellow", 1],
    ]);
  });

  it("marks the phase with the next stripe as current, and leaves phases without stripes unmarked", () => {
    expect(roadmap(course).phases.map((phase) => phase.status)).toEqual([null, "current", "todo"]);
  });

  it("continues with the first lesson of the current phase", () => {
    const { resume } = roadmap(course);
    expect(resume?.lesson.route).toBe("/lesson/p01/01-hello");
    expect(resume?.phase.title).toBe("First Steps");
  });

  it("falls back to the course's first lesson when the current phase has none yet", () => {
    const { resume } = roadmap(course, { stripes: { p01: 2 } });
    expect(resume?.lesson.route).toBe("/lesson/p01/01-hello");
  });

  it("has nothing to continue before any lesson is written", () => {
    const empty = {
      ...course,
      phases: course.phases.map((phase) => ({ ...phase, lessons: [] })),
    };
    expect(roadmap(empty).resume).toBeNull();
  });
});

describe("chapterRange", () => {
  it.each([
    [[1, 2, 3], "1–3"],
    [[10, 11], "10–11"],
    [[14], "14"],
    [[1, 3], "1, 3"],
    [[1, 2, 3, 5], "1–3, 5"],
    [[], ""],
  ])("writes %j as %j", (chapters, text) => {
    expect(chapterRange(chapters)).toBe(text);
  });
});
