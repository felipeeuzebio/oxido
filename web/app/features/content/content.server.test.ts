import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import lesson from "../../../../crates/oxido-content/tests/golden/lesson.json";
import { lessonRoutes, readLesson } from "./content.server";

// A compiled-content folder like `cargo xtask content` writes.
function compiled(): string {
  const root = mkdtempSync(join(tmpdir(), "oxido-content-"));
  mkdirSync(join(root, "lessons", "p01"), { recursive: true });
  writeFileSync(join(root, "lessons", "p01", "01-hello.json"), JSON.stringify(lesson));
  const course = { phases: [{ lessons: [{ route: "/lesson/p01/01-hello" }] }, { lessons: [] }] };
  writeFileSync(join(root, "course.json"), JSON.stringify(course));
  return root;
}

describe("reading compiled content at build time", () => {
  it("reads a lesson by phase and slug", async () => {
    const found = await readLesson("p01", "01-hello", compiled());
    expect(found.title).toBe("Hello, Cargo");
  });

  it("answers 404 for a lesson that isn't there", async () => {
    await expect(readLesson("p01", "99-nope", compiled())).rejects.toMatchObject({ status: 404 });
  });

  it("never reads outside the content folder", async () => {
    await expect(readLesson("..", "course", compiled())).rejects.toMatchObject({ status: 404 });
  });

  it("lists every lesson route to pre-render", () => {
    expect(lessonRoutes(compiled())).toEqual(["/lesson/p01/01-hello"]);
  });

  it("lists no routes before the content is compiled", () => {
    expect(lessonRoutes(join(tmpdir(), "oxido-no-such-folder"))).toEqual([]);
  });
});

describe("where the compiled content lives", () => {
  // CONTENT is read once, when the module loads, and this file already loaded
  // it above. Each test loads a fresh copy after stubbing the environment.
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads web/.content by default", async () => {
    vi.stubEnv("OXIDO_CONTENT_OUT", undefined);
    const { CONTENT } = await import("./content.server");
    expect(CONTENT).toBe(join(process.cwd(), ".content"));
  });

  it("reads the folder OXIDO_CONTENT_OUT names, as `cargo xtask content` writes it", async () => {
    // The e2e build compiles the fixture course into its own folder, so it
    // never replaces the course a running dev server reads.
    vi.stubEnv("OXIDO_CONTENT_OUT", ".content-e2e");
    const { CONTENT } = await import("./content.server");
    expect(CONTENT).toBe(join(process.cwd(), ".content-e2e"));
  });
});
