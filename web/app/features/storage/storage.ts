// Where the student's progress lives: oxido's progress file when the local app
// serves the page, the browser's own storage on the website (architecture.md,
// "Two ways to take the course"). One interface, one implementation per target;
// pick.ts chooses between them, and contract.ts checks that both behave alike.
import type { Progress } from "../progress/progress";

export interface VideoUpdate {
  seconds?: number;
  watched?: boolean;
}

export interface QuizUpdate {
  correct?: number;
  total?: number;
  done?: boolean;
}

interface Shared {
  progress(): Promise<Progress>;
  /** Saves the video's position and/or marks it watched, together. */
  saveVideo(classId: string, update: VideoUpdate): Promise<void>;
  /** Records an attempt (correct out of total) and/or marks the quiz done, together. */
  saveQuiz(quizId: string, update: QuizUpdate): Promise<void>;
}

/** oxido's progress file, through its API. Its tests decide when a task is done. */
export interface OxidoStorage extends Shared {
  readonly target: "oxido";
}

/** The browser's storage, on the website, where the student marks a task done by hand. */
export interface WebsiteStorage extends Shared {
  readonly target: "website";
  markTask(classId: string, marked: boolean): Promise<void>;
}

export type CourseStorage = OxidoStorage | WebsiteStorage;

/** A change the storage refused or couldn't make, with the HTTP status oxido would give. */
export class StorageError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
