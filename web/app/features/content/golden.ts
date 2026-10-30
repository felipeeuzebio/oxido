// The content compiler's golden lesson (crates/oxido-content/tests/golden),
// typed as the app reads it, for tests. A JSON import widens the task's kind
// to a string, so it's narrowed back here; contract.test.ts checks that the
// compiled kind really is "stripes".
import lesson from "../../../../crates/oxido-content/tests/golden/lesson.json";
import type { Lesson } from "./types";

export const goldenLesson: Lesson = { ...lesson, task: { ...lesson.task, kind: "stripes" } };
