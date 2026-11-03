import { describe, expect, it } from "vitest";
import { pickStorage } from "./pick";

const answer =
  (status: number, body: string, type = "application/json") =>
  async () =>
    new Response(body, { status, headers: { "content-type": type } });

describe("pickStorage", () => {
  it("uses oxido's API when oxido answers /api/health", async () => {
    const storage = await pickStorage(answer(200, '{"status":"ok","version":"0.13.0"}'));
    expect(storage.target).toBe("oxido");
  });

  it("uses the browser's storage on the website, where /api/health is a 404 page", async () => {
    const storage = await pickStorage(answer(404, "<h1>Not found</h1>", "text/html"));
    expect(storage.target).toBe("website");
  });

  it("uses the browser's storage when the request fails", async () => {
    const storage = await pickStorage(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(storage.target).toBe("website");
  });

  it("uses the browser's storage when something other than oxido answers", async () => {
    const storage = await pickStorage(answer(200, '{"status":"healthy"}'));
    expect(storage.target).toBe("website");
  });
});
