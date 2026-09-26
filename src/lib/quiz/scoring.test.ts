import { describe, expect, it } from "vitest";
import { correctAnswerText, gradeQuiz } from "./scoring";
import type { Question } from "./types";

const questions: Question[] = [
  {
    id: "q1",
    type: "MultipleChoice",
    prompt: "Which keyword makes a binding mutable?",
    choices: ["let", "mut", "const", "static"],
    answer: 1,
  },
  {
    id: "q2",
    type: "ShortAnswer",
    prompt: "What command creates a new Cargo project?",
    answer: "cargo new",
    alternatives: ["cargo init"],
  },
  {
    id: "q3",
    type: "Tracing",
    prompt: "Does this program compile? If it does, what does it print?",
    program: 'fn main() { let x = 5; println!("{x}"); }',
    answer: { doesCompile: true, stdout: "5" },
  },
  {
    id: "q4",
    type: "Tracing",
    prompt: "Does this program compile? If it does, what does it print?",
    program: "fn main() { let x = 5; x = 6; }",
    answer: { doesCompile: false },
  },
];

describe("gradeQuiz", () => {
  it("marks every answer right when all responses match", () => {
    const result = gradeQuiz(questions, {
      q1: { type: "MultipleChoice", choice: 1 },
      q2: { type: "ShortAnswer", text: "cargo new" },
      q3: { type: "Tracing", doesCompile: true, stdout: "5" },
      q4: { type: "Tracing", doesCompile: false },
    });
    expect(result.correct).toBe(4);
    expect(result.total).toBe(4);
    expect(result.items.every((item) => item.correct)).toBe(true);
  });

  it("marks a wrong multiple-choice answer as incorrect", () => {
    const result = gradeQuiz(questions, { q1: { type: "MultipleChoice", choice: 0 } });
    expect(result.items[0]).toEqual({ id: "q1", correct: false, skipped: false });
  });

  it("compares short answers ignoring case and surrounding spaces, and accepts alternatives", () => {
    const upper = gradeQuiz(questions, { q2: { type: "ShortAnswer", text: "  CARGO NEW " } });
    const alternative = gradeQuiz(questions, { q2: { type: "ShortAnswer", text: "cargo init" } });
    expect(upper.items[1].correct).toBe(true);
    expect(alternative.items[1].correct).toBe(true);
  });

  it("requires the compile verdict and the output to match for tracing questions", () => {
    const wrongOutput = gradeQuiz(questions, {
      q3: { type: "Tracing", doesCompile: true, stdout: "6" },
    });
    const trailingNewline = gradeQuiz(questions, {
      q3: { type: "Tracing", doesCompile: true, stdout: "5\n" },
    });
    expect(wrongOutput.items[2].correct).toBe(false);
    expect(trailingNewline.items[2].correct).toBe(true);
  });

  it("ignores the output when the program doesn't compile", () => {
    const result = gradeQuiz(questions, {
      q4: { type: "Tracing", doesCompile: false, stdout: "anything" },
    });
    expect(result.items[3].correct).toBe(true);
  });

  it("counts unanswered questions as wrong and flags them as skipped", () => {
    const result = gradeQuiz(questions, {});
    expect(result.correct).toBe(0);
    expect(result.items.every((item) => item.skipped && !item.correct)).toBe(true);
  });

  it("treats a response of the wrong kind as incorrect", () => {
    const result = gradeQuiz(questions, { q1: { type: "ShortAnswer", text: "mut" } });
    expect(result.items[0].correct).toBe(false);
  });
});

describe("correctAnswerText", () => {
  it("describes the correct answer for each question type", () => {
    expect(correctAnswerText(questions[0])).toBe("mut");
    expect(correctAnswerText(questions[1])).toBe("cargo new");
    expect(correctAnswerText(questions[2])).toBe("It compiles and prints: 5");
    expect(correctAnswerText(questions[3])).toBe("It does not compile.");
  });
});
