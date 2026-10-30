import { describe, expect, it } from "vitest";
import type { Task } from "../content/types";
import {
  type ClassProgress,
  isQuizDone,
  isTaskDone,
  isWatched,
  lastClass,
  NO_PROGRESS,
  type Progress,
  stripeId,
} from "./progress";

const STARTED: ClassProgress = {
  videoSeconds: 0,
  videoWatched: false,
  taskMarked: false,
  lastAt: null,
};

const withClass = (slug: string, change: Partial<ClassProgress>): Progress => ({
  ...NO_PROGRESS,
  classes: { [slug]: { ...STARTED, ...change } },
});

const earned = (...ids: string[]): Progress => ({
  ...NO_PROGRESS,
  stripes: Object.fromEntries(ids.map((id) => [id, "2026-10-01T10:00:00.000Z"])),
});

describe("isWatched", () => {
  it("counts a video watched once 90% of it has played", () => {
    expect(isWatched(359, 400)).toBe(false);
    expect(isWatched(360, 400)).toBe(true);
  });

  it("never counts a video without a length", () => {
    expect(isWatched(10, 0)).toBe(false);
  });
});

describe("stripeId", () => {
  it("names a stripe by its belt and its number on that belt", () => {
    expect(stripeId("purple", 3)).toBe("purple.3");
  });
});

describe("isTaskDone", () => {
  const stripes: Task = {
    kind: "stripes",
    belt: "white",
    stripes: [
      { number: 1, title: "a prompt" },
      { number: 2, title: ".exit" },
    ],
  };

  it("is done once every stripe the task adds is earned", () => {
    expect(isTaskDone(stripes, "02-guessing-game", earned("white.1"))).toBe(false);
    expect(isTaskDone(stripes, "02-guessing-game", earned("white.1", "white.2"))).toBe(true);
  });

  it("is done when the student marked it done by hand, as the website lets them", () => {
    const marked = withClass("36-unsafe", { taskMarked: true });
    expect(isTaskDone({ kind: "drill", name: "unsafe" }, "36-unsafe", marked)).toBe(true);
    expect(isTaskDone({ kind: "setup" }, "01-getting-started", marked)).toBe(false);
  });

  it("isn't done for a drill or the setup that nothing has marked", () => {
    expect(isTaskDone({ kind: "drill", name: "unsafe" }, "36-unsafe", NO_PROGRESS)).toBe(false);
    expect(isTaskDone({ kind: "setup" }, "01-getting-started", NO_PROGRESS)).toBe(false);
  });
});

describe("isQuizDone", () => {
  it("is done once taken or marked done, and not before", () => {
    expect(isQuizDone(undefined)).toBe(false);
    expect(isQuizDone({ lastCorrect: 0, bestCorrect: 0, total: 0, done: true })).toBe(true);
    expect(isQuizDone({ lastCorrect: 2, bestCorrect: 3, total: 5, done: false })).toBe(true);
  });
});

describe("lastClass", () => {
  it("is the class whose progress changed last", () => {
    const progress: Progress = {
      ...NO_PROGRESS,
      classes: {
        "01-getting-started": { ...STARTED, lastAt: "2026-10-02T09:00:00.000Z" },
        "02-guessing-game": { ...STARTED, lastAt: "2026-10-03T09:00:00.000Z" },
        "03-common-concepts": { ...STARTED, lastAt: null },
      },
    };
    expect(lastClass(progress)).toBe("02-guessing-game");
  });

  it("is nothing before any class has progress", () => {
    expect(lastClass(NO_PROGRESS)).toBeNull();
    expect(lastClass(withClass("01-getting-started", {}))).toBeNull();
  });
});
