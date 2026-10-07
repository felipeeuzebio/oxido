// Reads the compiled content at build time: route loaders run only while
// React Router pre-renders pages (ssr: false), never in the browser.
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Course, Lesson } from "./types.ts";

/**
 * Where `bun run content` writes; the build runs in web/. OXIDO_CONTENT_OUT
 * moves it, for `cargo xtask content` too: the e2e build uses its own folder so
 * it never replaces the course a running dev server reads.
 */
export const CONTENT = resolve(process.cwd(), process.env.OXIDO_CONTENT_OUT || ".content");

const SEGMENT = /^[a-z0-9-]+$/;

const notFound = () => new Response("Not found", { status: 404 });

/** A missing file; anything else (bad JSON, permissions) should fail the build. */
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export async function readLesson(phase: string, slug: string, root = CONTENT): Promise<Lesson> {
  if (!SEGMENT.test(phase) || !SEGMENT.test(slug)) throw notFound();
  try {
    return JSON.parse(await readFile(join(root, "lessons", phase, `${slug}.json`), "utf8"));
  } catch (error) {
    throw missing(error) ? notFound() : error;
  }
}

/** The compiled course, for the roadmap. */
export function readCourse(root = CONTENT): Course {
  const course = courseIn(root);
  if (!course) {
    throw new Error(`${join(root, "course.json")} doesn't exist yet: run \`cargo xtask content\``);
  }
  return course;
}

/** Every lesson's route, for pre-rendering. None before the content is compiled. */
export function lessonRoutes(root = CONTENT): string[] {
  const course = courseIn(root);
  return course
    ? course.phases.flatMap((phase) => phase.lessons.map((lesson) => lesson.route))
    : [];
}

function courseIn(root: string): Course | null {
  try {
    return JSON.parse(readFileSync(join(root, "course.json"), "utf8"));
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}
