// oxido's storage: the student's progress in the local app's progress file,
// through its API (architecture.md, "API"). oxido checks every change itself.
import type { Progress } from "../progress/progress";
import { isRecord, type OxidoStorage, StorageError } from "./storage";

/**
 * One JSON request to oxido's API. The app sends it with fetch; the e2e tests,
 * through Playwright's request context, with the same session.
 */
export interface Http {
  send(
    method: "GET" | "PUT",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json(): Promise<unknown> }>;
}

/** fetch, from a page oxido served, with the session cookie its launch link set. */
export const browserHttp: Http = {
  send: (method, path, body) =>
    fetch(path, {
      method,
      credentials: "same-origin",
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    }),
};

export function createOxidoStorage(http: Http = browserHttp): OxidoStorage {
  async function call(method: "GET" | "PUT", path: string, body?: unknown): Promise<unknown> {
    let response: Awaited<ReturnType<Http["send"]>>;
    try {
      response = await http.send(method, path, body);
    } catch {
      throw new StorageError(0, "oxido isn't answering. Is it still running?");
    }
    if (response.status >= 200 && response.status < 300) {
      return response.status === 204 ? undefined : response.json();
    }
    const answer = await response.json().catch(() => null);
    const message =
      isRecord(answer) && typeof answer.error === "string"
        ? answer.error
        : `oxido answered ${response.status}`;
    throw new StorageError(response.status, message);
  }

  // IDs go in the path encoded, so oxido sees one that tries to climb out of a
  // folder as it was written, and refuses it.
  const at = (kind: "classes" | "quizzes", id: string) => `/api/${kind}/${encodeURIComponent(id)}`;

  return {
    target: "oxido",
    // oxido's own answer, whose shape crates/oxido/tests/http.rs pins down.
    progress: async () => (await call("GET", "/api/progress")) as Progress,
    saveVideo: async (classId, update) => {
      await call("PUT", `${at("classes", classId)}/video`, update);
    },
    saveQuiz: async (quizId, update) => {
      await call("PUT", at("quizzes", quizId), update);
    },
  };
}
