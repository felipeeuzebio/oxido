import { describe, expect, it } from "vitest";
import golden from "../../../../crates/oxido-content/tests/golden/course.json";
import type { Course } from "../content/types";
import { type ClassProgress, NO_PROGRESS, type Progress } from "../progress/progress";
import { chapterRange, roadmap } from "./roadmap";

// The compiler's fixture course: a kickoff, then the white belt (p01, two
// stripes and both lessons) and the yellow belt (p02, one stripe, no lessons).
const course: Course = golden;

/** Progress with these stripes earned, by ID ("white.1"). */
const earned = (...ids: string[]): Progress => ({
  ...NO_PROGRESS,
  stripes: Object.fromEntries(ids.map((id) => [id, "2026-10-01T10:00:00.000Z"])),
});

const at = (lastAt: string): ClassProgress => ({
  videoSeconds: 30,
  videoWatched: false,
  taskMarked: false,
  lastAt,
});

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
    const view = roadmap(course, earned("white.1", "white.2"));
    const { belts, next, started } = view;
    expect(started).toBe(true);
    expect(view.earned).toBe(2);
    expect(belts.map((belt) => [belt.id, belt.earned, belt.sealed, belt.current])).toEqual([
      ["white", 2, true, false],
      ["yellow", 0, false, true],
    ]);
    expect(next).toMatchObject({ belt: "yellow", number: 1, of: 1, text: "rows" });
  });

  it("has no next stripe and no current belt once every stripe is earned", () => {
    const { belts, next, phases } = roadmap(course, earned("white.1", "white.2", "yellow.1"));
    expect(next).toBeNull();
    expect(belts.some((belt) => belt.current)).toBe(false);
    expect(phases.map((phase) => phase.status)).toEqual([null, "done", "done"]);
  });

  it("ignores stripes the course doesn't have", () => {
    expect(roadmap(course, earned("white.1", "white.9", "green.1")).earned).toBe(1);
  });

  it("counts a stripe earned before an earlier one, and keeps the earlier one next", () => {
    const { belts, next, phases } = roadmap(course, earned("white.2"));
    expect(belts[0].stripes).toEqual(["next", "earned"]);
    expect(next).toMatchObject({ belt: "white", number: 1 });
    expect(phases[1]).toMatchObject({ earned: 1, total: 2, status: "current" });
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
    const { resume } = roadmap(course, earned("white.1", "white.2"));
    expect(resume?.lesson.route).toBe("/lesson/p01/01-hello");
  });

  it("continues with the class the student was last in", () => {
    const progress: Progress = {
      ...NO_PROGRESS,
      classes: {
        "01-hello": at("2026-10-02T09:00:00.000Z"),
        "02-variables": at("2026-10-03T09:00:00.000Z"),
      },
    };
    const { resume } = roadmap(course, progress);
    expect(resume?.lesson.route).toBe("/lesson/p01/02-variables");
    expect(resume?.phase.title).toBe("First Steps");
  });

  it("ignores a last class the course no longer has", () => {
    const progress: Progress = {
      ...NO_PROGRESS,
      classes: { "07-gone": at("2026-10-03T09:00:00.000Z") },
    };
    expect(roadmap(course, progress).resume?.lesson.route).toBe("/lesson/p01/01-hello");
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
