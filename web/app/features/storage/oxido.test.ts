// oxido's side of the storage contract runs against the real server, in
// web/e2e/session.test.ts. These cover what that can't easily show.
import { describe, expect, it } from "vitest";
import { createOxidoStorage, type Http } from "./oxido";
import { StorageError } from "./storage";

interface Sent {
  method: string;
  path: string;
  body?: unknown;
}

/** An Http that records what's sent and gives one answer back. */
function answering(status: number, json: unknown = null): Http & { sent: Sent[] } {
  const sent: Sent[] = [];
  return {
    sent,
    async send(method, path, body) {
      sent.push(body === undefined ? { method, path } : { method, path, body });
      return { status, json: async () => json };
    },
  };
}

describe("oxido's storage", () => {
  it("sends a class's ID safely inside the path", async () => {
    const http = answering(204);
    await createOxidoStorage(http).saveVideo("../etc", { seconds: 1 });
    expect(http.sent).toEqual([
      { method: "PUT", path: "/api/classes/..%2Fetc/video", body: { seconds: 1 } },
    ]);
  });

  it("passes oxido's error on, with its status and message", async () => {
    const http = answering(401, { error: "open oxido's launch link first" });
    const failure = await createOxidoStorage(http)
      .progress()
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(StorageError);
    expect(failure).toMatchObject({ status: 401, message: "open oxido's launch link first" });
  });

  it("still fails clearly when an error comes without a message", async () => {
    const failure = await createOxidoStorage(answering(502, "<html>"))
      .progress()
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ status: 502 });
    expect((failure as Error).message).toMatch(/502/);
  });
});
