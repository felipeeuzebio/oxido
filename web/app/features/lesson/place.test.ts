import { describe, expect, it } from "vitest";
import golden from "../../../../crates/oxido-content/tests/golden/course.json";
import type { Course } from "../content/types";
import { lessonPlace } from "./place";

// The compiler's fixture course: p01 ("First Steps") plays helloVideo1, then shadowVid02.
const course: Course = golden;

describe("lessonPlace", () => {
  it("numbers a class by its phase and its video's place in that phase", () => {
    expect(lessonPlace(course, { phase: "p01", video: "shadowVid02" })).toEqual({
      phase: "Phase 1",
      phaseTitle: "First Steps",
      label: "Class 1.2",
    });
  });

  it("names a class in a phase outside the numbering by its phase", () => {
    const withKickoff: Course = {
      ...course,
      phases: course.phases.map((phase) =>
        phase.id === "kickoff" ? { ...phase, videos: ["tourVideo01"] } : phase,
      ),
    };
    expect(lessonPlace(withKickoff, { phase: "kickoff", video: "tourVideo01" })).toEqual({
      phase: "Kickoff",
      phaseTitle: "Kickoff",
      label: "Kickoff",
    });
  });
});
