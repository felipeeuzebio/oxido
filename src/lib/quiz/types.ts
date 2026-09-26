// Quiz model. The question kinds follow mdbook-quiz's schema
// (https://github.com/cognitive-engineering-lab/mdbook-quiz) so quiz content
// stays portable, but the shape is flattened for the app.

interface QuestionBase {
  id: string;
  prompt: string;
  /** Shown on the results page, after the student has answered. */
  explanation?: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "MultipleChoice";
  choices: string[];
  /** Index into `choices`. */
  answer: number;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: "ShortAnswer";
  answer: string;
  alternatives?: string[];
}

export interface TracingQuestion extends QuestionBase {
  type: "Tracing";
  program: string;
  answer: { doesCompile: true; stdout: string } | { doesCompile: false };
}

export type Question = MultipleChoiceQuestion | ShortAnswerQuestion | TracingQuestion;

export type Response =
  | { type: "MultipleChoice"; choice: number }
  | { type: "ShortAnswer"; text: string }
  | { type: "Tracing"; doesCompile: boolean; stdout?: string };

export interface ItemResult {
  id: string;
  correct: boolean;
  /** True when the student left the question blank. */
  skipped: boolean;
}

export interface QuizResult {
  items: ItemResult[];
  correct: number;
  total: number;
}
