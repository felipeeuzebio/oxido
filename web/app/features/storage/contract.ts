// The storage contract: what both kinds of storage do, checked against each of
// them. browser.test.ts runs it against the website's browser storage, and
// web/e2e/session.test.ts against oxido's API on the real server. Each case
// uses IDs of its own, so the cases can share one oxido progress file.
import assert from "node:assert/strict";
import { type CourseStorage, StorageError } from "./storage";

export interface ContractCase {
  name: string;
  run(storage: CourseStorage): Promise<void>;
}

const refused = (status: number) => (error: unknown) =>
  error instanceof StorageError && error.status === status;

const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;

const pause = () => new Promise((resolve) => setTimeout(resolve, 5));

export const contract: ContractCase[] = [
  {
    name: "has no progress for a class or quiz it hasn't seen",
    async run(storage) {
      const progress = await storage.progress();
      assert.equal(progress.classes["unseen-1"], undefined);
      assert.equal(progress.quizzes["unseen-1"], undefined);
    },
  },
  {
    name: "keeps a video's latest position, and when it changed",
    async run(storage) {
      await storage.saveVideo("position-1", { seconds: 120 });
      await storage.saveVideo("position-1", { seconds: 391 });
      const saved = (await storage.progress()).classes["position-1"];
      assert.equal(saved?.videoSeconds, 391);
      assert.equal(saved?.videoWatched, false);
      assert.match(saved?.lastAt ?? "", TIME);
    },
  },
  {
    name: "marks a video watched and keeps its position",
    async run(storage) {
      await storage.saveVideo("watched-1", { seconds: 200 });
      await storage.saveVideo("watched-1", { watched: true });
      const saved = (await storage.progress()).classes["watched-1"];
      assert.deepEqual([saved?.videoSeconds, saved?.videoWatched], [200, true]);
    },
  },
  {
    name: "saves a position and the watched flag together",
    async run(storage) {
      await storage.saveVideo("both-1", { seconds: 412, watched: true });
      const saved = (await storage.progress()).classes["both-1"];
      assert.deepEqual([saved?.videoSeconds, saved?.videoWatched], [412, true]);
    },
  },
  {
    name: "moves a class's lastAt on with each change",
    async run(storage) {
      await storage.saveVideo("last-1", { seconds: 1 });
      const first = (await storage.progress()).classes["last-1"]?.lastAt ?? "";
      await pause();
      await storage.saveVideo("last-1", { watched: true });
      const after = (await storage.progress()).classes["last-1"]?.lastAt ?? "";
      assert.ok(after > first, `${after} should come after ${first}`);
    },
  },
  {
    name: "refuses a video update with nothing in it",
    async run(storage) {
      await assert.rejects(storage.saveVideo("empty-1", {}), refused(400));
    },
  },
  {
    name: "keeps a quiz's latest and best scores",
    async run(storage) {
      await storage.saveQuiz("scores-1", { correct: 3, total: 5 });
      await storage.saveQuiz("scores-1", { correct: 5, total: 5 });
      await storage.saveQuiz("scores-1", { correct: 2, total: 5 });
      const saved = (await storage.progress()).quizzes["scores-1"];
      assert.deepEqual(saved, { lastCorrect: 2, bestCorrect: 5, total: 5, done: false });
    },
  },
  {
    name: "starts a quiz's best score over when the quiz changes size",
    async run(storage) {
      await storage.saveQuiz("size-1", { correct: 5, total: 5 });
      await storage.saveQuiz("size-1", { correct: 3, total: 6 });
      const saved = (await storage.progress()).quizzes["size-1"];
      assert.deepEqual([saved?.bestCorrect, saved?.total], [3, 6]);
    },
  },
  {
    name: "marks a quiz done without taking it",
    async run(storage) {
      await storage.saveQuiz("done-1", { done: true });
      const saved = (await storage.progress()).quizzes["done-1"];
      assert.deepEqual([saved?.done, saved?.total], [true, 0]);
    },
  },
  {
    name: "refuses impossible quiz scores",
    async run(storage) {
      await assert.rejects(storage.saveQuiz("bad-1", { correct: 6, total: 5 }), refused(400));
      await assert.rejects(storage.saveQuiz("bad-1", { correct: 0, total: 0 }), refused(400));
      await assert.rejects(storage.saveQuiz("bad-1", {}), refused(400));
    },
  },
  {
    name: "refuses IDs that could climb out of a folder or pass for an option",
    async run(storage) {
      await assert.rejects(storage.saveVideo("../etc", { seconds: 1 }), refused(400));
      await assert.rejects(storage.saveQuiz("-rf", { done: true }), refused(400));
    },
  },
];
