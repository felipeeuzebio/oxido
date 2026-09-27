import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizResults } from "./QuizResults";
import type { Question, QuizResult } from "./types";

const questions: Question[] = [
  { id: "q1", type: "MultipleChoice", prompt: "Pick mut", choices: ["let", "mut"], answer: 1 },
  {
    id: "q2",
    type: "ShortAnswer",
    prompt: "Create a project",
    answer: "cargo new",
    explanation: "cargo new creates a folder with Cargo.toml and src/main.rs.",
  },
  { id: "q3", type: "ShortAnswer", prompt: "Build a project", answer: "cargo build" },
];

const result: QuizResult = {
  items: [
    { id: "q1", correct: true, skipped: false },
    { id: "q2", correct: false, skipped: false },
    { id: "q3", correct: false, skipped: true },
  ],
  correct: 1,
  total: 3,
};

describe("QuizResults", () => {
  it("shows the score as the heading of the score card", () => {
    render(<QuizResults questions={questions} result={result} />);
    expect(screen.getByRole("heading", { name: "1 of 3 correct" })).toBeTruthy();
  });

  it("lists every question under its own heading", () => {
    render(<QuizResults questions={questions} result={result} />);
    expect(screen.getByRole("heading", { name: "Questions" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("offers to reveal the correct answer only for questions the student missed", () => {
    render(<QuizResults questions={questions} result={result} />);
    expect(screen.getAllByText("Show correct answer")).toHaveLength(2);
    expect(screen.getByText("cargo new")).toBeTruthy();
    expect(screen.getByText(/creates a folder/)).toBeTruthy();
  });

  it("labels skipped questions differently from wrong ones", () => {
    render(<QuizResults questions={questions} result={result} />);
    expect(screen.getByText("Right")).toBeTruthy();
    expect(screen.getByText("Wrong")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
  });

  it("lets the student retake or mark the quiz as done", async () => {
    const onRetake = vi.fn();
    const onMarkDone = vi.fn();
    render(
      <QuizResults
        questions={questions}
        result={result}
        onRetake={onRetake}
        onMarkDone={onMarkDone}
      />,
    );

    await fireEvent.click(screen.getByRole("button", { name: "Retake quiz" }));
    await fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));

    expect(onRetake).toHaveBeenCalledOnce();
    expect(onMarkDone).toHaveBeenCalledOnce();
  });
});
