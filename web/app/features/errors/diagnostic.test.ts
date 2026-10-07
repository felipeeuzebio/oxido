// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diagnose } from "./diagnostic";

// What React Router hands the error boundary for a thrown Response.
const response = (status: number, statusText: string, data: unknown = "") => ({
  status,
  statusText,
  internal: false,
  data,
});

// A V8 (Chrome, Node) stack, as the dev server serves the modules.
const v8Stack = [
  "TypeError: Cannot read properties of undefined (reading 'title')",
  "    at LessonPage (http://127.0.0.1:5173/app/routes/lesson.tsx?t=1727790000000:18:11)",
  "    at renderWithHooks (http://127.0.0.1:5173/node_modules/.vite/deps/react-dom.js?v=51e3e0ab:4206:24)",
  "    at http://127.0.0.1:5173/node_modules/.vite/deps/react-dom.js?v=51e3e0ab:9800:5",
].join("\n");

function crash(stack: string): Error {
  const error = new TypeError("Cannot read properties of undefined (reading 'title')");
  error.stack = stack;
  return error;
}

describe("diagnose", () => {
  it("reads a missing page as error[404] at its path", () => {
    const d = diagnose(response(404, "Not Found"), "/no/such/page", false);
    expect(d).toMatchObject({
      title: "Page not found",
      code: "error[404]",
      message: "no page at this address",
      location: "/no/such/page",
      notFound: true,
    });
    expect(d.help).toBeUndefined();
    expect(d.backtrace).toBeUndefined();
  });

  it("says where lessons live when a lesson is missing", () => {
    const d = diagnose(response(404, "Not Found"), "/lesson/p01/99-nope", false);
    expect(d.help).toBe("lessons live at /lesson/<phase>/<slug>");
    expect(d.note).toBe("the link may be old, or the lesson isn't written yet");
  });

  it("reads a page that was never pre-rendered as a 404", () => {
    // Loading such a path directly serves the SPA fallback, which holds no data
    // for the route, and React Router says so with this error. With ssr: false
    // that only happens to a page that doesn't exist (e2e/errors.test.ts).
    const error = new Error('No result found for routeId "routes/lesson"');
    const d = diagnose(error, "/lesson/p01/99-nope", true);
    expect(d).toMatchObject({ title: "Page not found", code: "error[404]", notFound: true });
    expect(d.help).toBe("lessons live at /lesson/<phase>/<slug>");
    expect(d.backtrace).toBeUndefined();
  });

  it("keeps the status of any other error response", () => {
    const d = diagnose(
      response(500, "Internal Server Error", "the course didn't load"),
      "/",
      false,
    );
    expect(d).toMatchObject({
      title: "Something went wrong",
      code: "error[500]",
      note: "the course didn't load",
      notFound: false,
    });
  });

  it("points a crash in development at its first frame and keeps a backtrace", () => {
    const d = diagnose(crash(v8Stack), "/lesson/p01/01-getting-started", true);
    expect(d).toMatchObject({
      title: "Something went wrong",
      code: "error",
      message: "this page panicked",
      location: "app/routes/lesson.tsx:18:11",
      note: "Cannot read properties of undefined (reading 'title')",
      notFound: false,
    });
    expect(d.backtrace).toBe(
      [
        "   0: LessonPage",
        "             at app/routes/lesson.tsx:18:11",
        "   1: renderWithHooks",
        "             at node_modules/.vite/deps/react-dom.js:4206:24",
        "   2: <anonymous>",
        "             at node_modules/.vite/deps/react-dom.js:9800:5",
      ].join("\n"),
    );
  });

  it("says how many frames a long backtrace leaves out", () => {
    const deep = (count: number) =>
      [
        "Error: deep",
        ...Array.from(
          { length: count },
          (_, i) => `    at f${i} (http://127.0.0.1:5173/app/x.tsx:${i + 1}:1)`,
        ),
      ].join("\n");
    const cut = diagnose(crash(deep(15)), "/", true).backtrace ?? "";
    expect(cut).toContain("  11: f11\n");
    expect(cut).not.toContain("f12");
    expect(cut.split("\n").at(-1)).toBe("      ... 3 more frames");
    expect(
      diagnose(crash(deep(13)), "/", true)
        .backtrace?.split("\n")
        .at(-1),
    ).toBe("      ... 1 more frame");
    expect(diagnose(crash(deep(12)), "/", true).backtrace).not.toContain("more frame");
  });

  it("reads Firefox and Safari stacks too", () => {
    const stack =
      "LessonPage@http://127.0.0.1:5173/app/routes/lesson.tsx:18:11\n@http://127.0.0.1:5173/app/root.tsx:40:3";
    const d = diagnose(crash(stack), "/", true);
    expect(d.location).toBe("app/routes/lesson.tsx:18:11");
    expect(d.backtrace).toContain("   1: <anonymous>\n             at app/root.tsx:40:3");
  });

  it("shows a crash's message in production, but never its stack", () => {
    const d = diagnose(crash(v8Stack), "/lesson/p01/01-getting-started", false);
    expect(d.location).toBe("/lesson/p01/01-getting-started");
    expect(d.note).toBe("Cannot read properties of undefined (reading 'title')");
    expect(d.backtrace).toBeUndefined();
  });

  it("still says what was thrown when it isn't an Error", () => {
    const d = diagnose("the store is locked", "/", true);
    expect(d).toMatchObject({
      code: "error",
      message: "this page panicked",
      note: "the store is locked",
    });
    expect(d.backtrace).toBeUndefined();
  });
});
