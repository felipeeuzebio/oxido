// The compiled course, as `cargo xtask content` writes it (crates/oxido-content).
// contract.test.ts checks these types against the compiler's golden output.
import type { Question } from "../quiz/types.ts";

export interface Course {
  title: string;
  project: string;
  playlist: string;
  languages: string[];
  belts: Belt[];
  phases: Phase[];
  /** The quizzes that are written, by ID. */
  quizzes: string[];
}

export interface Belt {
  id: string;
  phases: string[];
}

export interface Phase {
  id: string;
  title: string;
  chapters: number[];
  build: string;
  /** One sentence for students, shown on the roadmap's phase card. */
  summary: string;
  stripes: string[];
  quiz: string | null;
  studentTdd: boolean;
  /** YouTube IDs, in playlist order. */
  videos: string[];
  lessons: LessonSummary[];
}

export interface LessonSummary {
  slug: string;
  title: string;
  video: string;
  route: string;
}

export interface Lesson extends LessonSummary {
  phase: string;
  headings: Heading[];
  /** Compiled from the lesson's Markdown; raw HTML in it was escaped. */
  html: string;
}

export interface Heading {
  depth: number;
  id: string;
  text: string;
}

export interface Quiz {
  id: string;
  questions: Question[];
}
