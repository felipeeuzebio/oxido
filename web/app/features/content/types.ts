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
  /** The video's length in seconds, from its outline. */
  duration: number;
  /** The video's chapters, as its outline names them (decision D35). */
  chapters: Chapter[];
  /** What the class asks of the student once the video is done (decision D35). */
  task: Task;
}

/** A chapter of the video and when it starts. */
export interface Chapter {
  title: string;
  /** Seconds into the video. */
  start: number;
}

/**
 * What a class asks of the student after the video (decision D35): stripes of
 * its belt, numbered as the belt numbers them; a drill, for a topic minisql has
 * no use for; or, in class 1, the setup.
 */
export type Task =
  | { kind: "stripes"; belt: string; stripes: Stripe[] }
  | { kind: "drill"; name: string }
  | { kind: "setup" };

export interface Stripe {
  number: number;
  /** What the stripe adds, as course.toml describes it. */
  title: string;
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

/** A phase and its written lessons: what the command palette searches. */
export interface PhaseLessons {
  id: string;
  title: string;
  lessons: { title: string; route: string }[];
}
