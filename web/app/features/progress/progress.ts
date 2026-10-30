// The student's progress, as either kind of storage gives it to the app
// (oxido's progress file, or the website's browser storage), and the rules
// for what it adds up to.
import type { Task } from "../content/types";

export interface ClassProgress {
  /** Where the video was left, in seconds. */
  videoSeconds: number;
  videoWatched: boolean;
  /** The task marked done by hand, on the website, where tests can't run. */
  taskMarked: boolean;
  /** When any of the above last changed (ISO 8601, UTC); null if none has. */
  lastAt: string | null;
}

export interface QuizProgress {
  lastCorrect: number;
  bestCorrect: number;
  total: number;
  done: boolean;
}

export interface Progress {
  /** By lesson slug: `01-getting-started`. */
  classes: Record<string, ClassProgress>;
  /** By quiz ID: `quiz-01`. */
  quizzes: Record<string, QuizProgress>;
  /** Each earned stripe, by `stripeId`, with when its tests first passed. */
  stripes: Record<string, string>;
}

export const NO_PROGRESS: Progress = { classes: {}, quizzes: {}, stripes: {} };

/** How much of a video has to play before it counts as watched. */
export const WATCHED_SHARE = 0.9;

/** Whether `played` seconds of a `duration`-second video count as watching it. */
export const isWatched = (played: number, duration: number) =>
  duration > 0 && played >= WATCHED_SHARE * duration;

/** A stripe's ID: its belt and its number on that belt, as in `purple.3` (decision D35). */
export const stripeId = (belt: string, number: number) => `${belt}.${number}`;

/**
 * A class's task is done when every stripe it adds is earned, or when the
 * student marked it done by hand. Drills and the setup have only the mark
 * until `oxido` runs their checks.
 */
export function isTaskDone(task: Task, slug: string, progress: Progress): boolean {
  if (progress.classes[slug]?.taskMarked) return true;
  if (task.kind !== "stripes") return false;
  return task.stripes.every(
    (stripe) => progress.stripes[stripeId(task.belt, stripe.number)] !== undefined,
  );
}

/** A quiz counts as done once it's taken or marked done; it never blocks anything. */
export const isQuizDone = (quiz: QuizProgress | undefined) =>
  quiz !== undefined && (quiz.done || quiz.total > 0);

/** The class whose progress changed last, by slug: where the student left off. */
export function lastClass(progress: Progress): string | null {
  let last: [string, string] | null = null;
  for (const [slug, { lastAt }] of Object.entries(progress.classes)) {
    if (lastAt !== null && (last === null || lastAt > last[1])) last = [slug, lastAt];
  }
  return last?.[0] ?? null;
}
