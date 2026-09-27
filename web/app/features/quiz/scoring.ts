import type { ItemResult, Question, QuizResult, Response } from "./types";

const normalize = (text: string) => text.trim().toLowerCase();

function isCorrect(question: Question, response: Response): boolean {
  switch (question.type) {
    case "MultipleChoice":
      return response.type === "MultipleChoice" && response.choice === question.answer;

    case "ShortAnswer": {
      if (response.type !== "ShortAnswer") return false;
      const accepted = [question.answer, ...(question.alternatives ?? [])].map(normalize);
      return accepted.includes(normalize(response.text));
    }

    case "Tracing": {
      if (response.type !== "Tracing") return false;
      if (response.doesCompile !== question.answer.doesCompile) return false;
      if (!question.answer.doesCompile) return true;
      return (response.stdout ?? "").trimEnd() === question.answer.stdout.trimEnd();
    }
  }
}

/**
 * Grades a finished quiz. Nothing is graded while the student is answering;
 * the results page shows every item at once.
 */
export function gradeQuiz(
  questions: Question[],
  responses: Record<string, Response | undefined>,
): QuizResult {
  const items: ItemResult[] = questions.map((question) => {
    const response = responses[question.id];
    if (response === undefined) return { id: question.id, correct: false, skipped: true };
    return { id: question.id, correct: isCorrect(question, response), skipped: false };
  });

  return {
    items,
    correct: items.filter((item) => item.correct).length,
    total: questions.length,
  };
}

/** The text revealed under "Show correct answer" on the results page. */
export function correctAnswerText(question: Question): string {
  switch (question.type) {
    case "MultipleChoice":
      return question.choices[question.answer];
    case "ShortAnswer":
      return question.answer;
    case "Tracing":
      return question.answer.doesCompile
        ? `It compiles and prints: ${question.answer.stdout}`
        : "It does not compile.";
  }
}
