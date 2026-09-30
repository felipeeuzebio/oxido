// Reads the compiled content at build time: route loaders run only while
// React Router pre-renders pages (ssr: false), never in the browser.
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Course, Lesson } from "./types";

/** Where `bun run content` writes; the build runs in web/. */
export const CONTENT = resolve(process.cwd(), ".content");

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

/** Every lesson's route, for pre-rendering. None before the content is compiled. */
export function lessonRoutes(root = CONTENT): string[] {
  let course: Course;
  try {
    course = JSON.parse(readFileSync(join(root, "course.json"), "utf8"));
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
  return course.phases.flatMap((phase) => phase.lessons.map((lesson) => lesson.route));
}
