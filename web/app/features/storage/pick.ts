// The page asks /api/health at startup. When oxido answers, progress goes to
// its progress file; anything else means the website, where progress stays in
// the browser (architecture.md, "Two ways to take the course").
import { browserShelf, createBrowserStorage } from "./browser";
import { createOxidoStorage } from "./oxido";
import { type CourseStorage, isRecord } from "./storage";

export async function pickStorage(
  health: () => Promise<Response> = () => fetch("/api/health"),
): Promise<CourseStorage> {
  return (await oxidoAnswers(health)) ? createOxidoStorage() : createBrowserStorage(browserShelf());
}

async function oxidoAnswers(health: () => Promise<Response>): Promise<boolean> {
  try {
    const response = await health();
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return isRecord(body) && body.status === "ok";
  } catch {
    // No answer, or an answer that isn't JSON, like GitHub Pages' 404 page.
    return false;
  }
}
