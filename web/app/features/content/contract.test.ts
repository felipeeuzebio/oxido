import { describe, expect, it } from "vitest";
import course from "../../../../crates/oxido-content/tests/golden/course.json";
import lesson from "../../../../crates/oxido-content/tests/golden/lesson.json";
import quiz from "../../../../crates/oxido-content/tests/golden/quiz.json";
import { gradeQuiz } from "../quiz/scoring";
import type { Question, Response } from "../quiz/types";
import type { Course, Lesson } from "./types";

// The content compiler's golden output (crates/oxido-content/tests/golden),
// read as the app reads it. If the compiler changes a field, `bun run check`
// fails on these assignments until the types follow.
const typedCourse: Course = course;
const typedLesson: Lesson = lesson;

describe("the compiled content", () => {
  it("fits the app's course and lesson types", () => {
    expect(typedCourse.phases.map((phase) => phase.id)).toEqual(["kickoff", "p01", "p02"]);
    expect(typedLesson.route).toBe("/lesson/p01/01-hello");
  });

  // JSON imports widen "MultipleChoice" to string, so quizzes are checked by
  // grading the compiled quiz with the app's own scoring.
  it("gives quizzes the app can grade", () => {
    const questions = quiz.questions as Question[];
    const right: Record<string, Response> = {
      "cargo-run": { type: "MultipleChoice", choice: 1 },
      "shadowing-name": { type: "ShortAnswer", text: "Variable shadowing" },
      "does-it-compile": { type: "Tracing", doesCompile: true, stdout: "6\n" },
      "mutate-immutable": { type: "Tracing", doesCompile: false },
    };
    const result = gradeQuiz(questions, right);
    expect(result.correct).toBe(questions.length);
  });
});
