// The website's storage: the student's progress in the browser's localStorage,
// kept the way oxido's progress file keeps it, with a time for each value, so
// the export file can carry it (decision D18). It refuses what oxido refuses,
// so both keep the storage contract (contract.ts).
import type { ClassProgress, Progress, QuizProgress } from "../progress/progress";
import { isRecord, StorageError, type WebsiteStorage } from "./storage";

const KEY = "oxido:progress";

/** The part of localStorage this uses. */
export type Shelf = Pick<Storage, "getItem" | "setItem">;

/** A class as stored: each value with the time it last changed, or null. */
interface SavedClass {
  videoSeconds: number;
  videoSecondsAt: string | null;
  videoWatched: boolean;
  videoWatchedAt: string | null;
  taskMarked: boolean;
  taskMarkedAt: string | null;
}

interface SavedQuiz {
  lastCorrect: number;
  bestCorrect: number;
  total: number;
  lastAt: string | null;
  done: boolean;
  doneAt: string | null;
}

interface Saved {
  classes: Record<string, SavedClass>;
  quizzes: Record<string, SavedQuiz>;
}

const NEW_CLASS: SavedClass = {
  videoSeconds: 0,
  videoSecondsAt: null,
  videoWatched: false,
  videoWatchedAt: null,
  taskMarked: false,
  taskMarkedAt: null,
};

const NEW_QUIZ: SavedQuiz = {
  lastCorrect: 0,
  bestCorrect: 0,
  total: 0,
  lastAt: null,
  done: false,
  doneAt: null,
};

/** The browser's localStorage, if it lets us have it. */
export function browserShelf(): Shelf | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Without a shelf (storage blocked, or a private window that refuses it),
 * progress lasts for the visit.
 */
export function createBrowserStorage(
  shelf: Shelf | undefined,
  now = () => new Date().toISOString(),
): WebsiteStorage {
  let visit: Saved = { classes: {}, quizzes: {} };

  const read = (): Saved => {
    if (!shelf) return visit;
    try {
      return parse(shelf.getItem(KEY));
    } catch {
      return { classes: {}, quizzes: {} };
    }
  };

  const write = (saved: Saved) => {
    if (!shelf) {
      visit = saved;
      return;
    }
    try {
      shelf.setItem(KEY, JSON.stringify(saved));
    } catch {
      throw new StorageError(
        507,
        "The browser wouldn't keep your progress: its storage may be full, or turned off for this site.",
      );
    }
  };

  const changeClass = (classId: string, change: (current: SavedClass) => SavedClass) => {
    const saved = read();
    const current = saved.classes[classId] ?? NEW_CLASS;
    write({ ...saved, classes: { ...saved.classes, [classId]: change(current) } });
  };

  return {
    target: "website",

    async progress() {
      const saved = read();
      const classes: Record<string, ClassProgress> = {};
      for (const [id, entry] of Object.entries(saved.classes)) {
        classes[id] = {
          videoSeconds: entry.videoSeconds,
          videoWatched: entry.videoWatched,
          taskMarked: entry.taskMarked,
          lastAt: latest([entry.videoSecondsAt, entry.videoWatchedAt, entry.taskMarkedAt]),
        };
      }
      const quizzes: Record<string, QuizProgress> = {};
      for (const [id, quiz] of Object.entries(saved.quizzes)) {
        const { lastCorrect, bestCorrect, total, done } = quiz;
        quizzes[id] = { lastCorrect, bestCorrect, total, done };
      }
      // Stripes come from their tests, which only oxido can run.
      return { classes, quizzes, stripes: {} } satisfies Progress;
    },

    async saveVideo(classId, { seconds, watched }) {
      checkId("class", classId);
      if (seconds === undefined && !watched) {
        throw new StorageError(400, "send seconds (the video position) and/or watched: true");
      }
      if (seconds !== undefined && !isWhole(seconds)) {
        throw new StorageError(400, "seconds must be a whole number, from 0");
      }
      const at = now();
      changeClass(classId, (current) => ({
        ...current,
        ...(seconds === undefined ? {} : { videoSeconds: seconds, videoSecondsAt: at }),
        ...(watched ? { videoWatched: true, videoWatchedAt: at } : {}),
      }));
    },

    async saveQuiz(quizId, { correct, total, done }) {
      checkId("quiz", quizId);
      if ((correct === undefined) !== (total === undefined)) {
        throw new StorageError(400, "send both correct and total for a quiz score");
      }
      const score = correct !== undefined && total !== undefined ? { correct, total } : null;
      if (!score && !done) {
        throw new StorageError(
          400,
          "send both correct and total for a quiz score, and/or done: true",
        );
      }
      if (
        score &&
        (!isWhole(score.correct) ||
          !isWhole(score.total) ||
          score.total === 0 ||
          score.correct > score.total)
      ) {
        throw new StorageError(
          400,
          `a quiz score must be between 0 and a positive total (got ${score.correct} of ${score.total})`,
        );
      }
      const at = now();
      const saved = read();
      const current = saved.quizzes[quizId] ?? NEW_QUIZ;
      // The best score only counts against a quiz of the same size.
      const attempt = score
        ? {
            lastCorrect: score.correct,
            bestCorrect:
              current.total === score.total
                ? Math.max(current.bestCorrect, score.correct)
                : score.correct,
            total: score.total,
            lastAt: at,
          }
        : {};
      const next = { ...current, ...attempt, ...(done ? { done: true, doneAt: at } : {}) };
      write({ ...saved, quizzes: { ...saved.quizzes, [quizId]: next } });
    },

    async markTask(classId, marked) {
      checkId("class", classId);
      const at = now();
      changeClass(classId, (current) => ({ ...current, taskMarked: marked, taskMarkedAt: at }));
    },
  };
}

/** The latest of some times, or null if none is set. */
function latest(times: (string | null)[]): string | null {
  return times.reduce<string | null>(
    (last, time) => (time !== null && (last === null || time > last) ? time : last),
    null,
  );
}

const isWhole = (value: number) => Number.isInteger(value) && value >= 0;

const MAX_ID_LENGTH = 64;

/**
 * oxido's rule for IDs (crates/oxido/src/store.rs): letters, digits, dots,
 * dashes and underscores, never starting with a dot or a dash.
 */
function checkId(what: string, id: string) {
  const valid =
    id.length > 0 &&
    id.length <= MAX_ID_LENGTH &&
    !/^[.-]/.test(id) &&
    /^[A-Za-z0-9._-]+$/.test(id);
  if (!valid) throw new StorageError(400, `not a valid ${what} id: ${JSON.stringify(id)}`);
}

/** What localStorage holds, kept only where it has the shape this writes. */
function parse(text: string | null): Saved {
  const value: unknown = text === null ? null : JSON.parse(text);
  const saved: Saved = { classes: {}, quizzes: {} };
  if (!isRecord(value)) return saved;
  for (const [id, entry] of Object.entries(isRecord(value.classes) ? value.classes : {})) {
    if (isRecord(entry)) saved.classes[id] = readClass(entry);
  }
  for (const [id, entry] of Object.entries(isRecord(value.quizzes) ? value.quizzes : {})) {
    if (isRecord(entry)) saved.quizzes[id] = readQuiz(entry);
  }
  return saved;
}

const count = (value: unknown) => (typeof value === "number" && isWhole(value) ? value : 0);
const flag = (value: unknown) => value === true;
const time = (value: unknown) => (typeof value === "string" ? value : null);

function readClass(entry: Record<string, unknown>): SavedClass {
  return {
    videoSeconds: count(entry.videoSeconds),
    videoSecondsAt: time(entry.videoSecondsAt),
    videoWatched: flag(entry.videoWatched),
    videoWatchedAt: time(entry.videoWatchedAt),
    taskMarked: flag(entry.taskMarked),
    taskMarkedAt: time(entry.taskMarkedAt),
  };
}

function readQuiz(entry: Record<string, unknown>): SavedQuiz {
  return {
    lastCorrect: count(entry.lastCorrect),
    bestCorrect: count(entry.bestCorrect),
    total: count(entry.total),
    lastAt: time(entry.lastAt),
    done: flag(entry.done),
    doneAt: time(entry.doneAt),
  };
}
