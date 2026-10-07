// Turns whatever the router caught into the lines the error page prints the
// way rustc prints a diagnostic: `error[404]: ...`, ` --> where`, `= help:`.
// Stacks become a Rust-style backtrace, shown only in development.
import { isRouteErrorResponse } from "react-router";

export interface Diagnostic {
  /** The page's heading and title. */
  title: string;
  /** `error[404]`, or plain `error` for a crash. */
  code: string;
  message: string;
  /** The page's path, or a crash's first frame in development. */
  location: string;
  help?: string;
  note?: string;
  /** Development only. */
  backtrace?: string;
  /** Leads with the roadmap instead of trying again. */
  notFound: boolean;
}

interface Frame {
  name: string;
  file: string;
}

const MAX_FRAMES = 12;

// V8 (Chrome, Node): `    at name (url:line:col)` or `    at url:line:col`.
const V8_FRAME = /^\s*at (?:(.*?) \()?(.+?):(\d+):(\d+)\)?$/;
// Firefox and Safari: `name@url:line:col`.
const GECKO_FRAME = /^(.*?)@(.+?):(\d+):(\d+)$/;

/** `http://127.0.0.1:5173/app/x.tsx?t=1` → `app/x.tsx`. */
const clean = (url: string) =>
  url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*\//i, "").replace(/\?.*$/, "");

function frames(stack: string): Frame[] {
  return stack.split("\n").flatMap((line) => {
    const m = V8_FRAME.exec(line) ?? GECKO_FRAME.exec(line);
    if (!m) return [];
    const [, name, url, row, column] = m;
    return [{ name: name || "<anonymous>", file: `${clean(url)}:${row}:${column}` }];
  });
}

// Frames past MAX_FRAMES are counted, so a cut trace doesn't pass for a whole one.
function backtrace(list: Frame[]): string {
  const shown = list
    .slice(0, MAX_FRAMES)
    .map((f, i) => `${String(i).padStart(4)}: ${f.name}\n${" ".repeat(13)}at ${f.file}`);
  const hidden = list.length - MAX_FRAMES;
  if (hidden > 0) shown.push(`      ... ${hidden} more frame${hidden === 1 ? "" : "s"}`);
  return shown.join("\n");
}

const crashed = (location: string, note: string, trace?: string): Diagnostic => ({
  title: "Something went wrong",
  code: "error",
  message: "this page panicked",
  location,
  note,
  backtrace: trace || undefined,
  notFound: false,
});

// Loading a path that was never pre-rendered serves the SPA fallback, which
// holds no data for the route's loader, and React Router throws this. With
// ssr: false that only happens to a page that doesn't exist: React Router's
// dev server says such a path "will be a 404" in production. Its error class
// isn't exported, so the message is matched; e2e/errors.test.ts fails if a
// React Router update changes it.
const NOT_PRERENDERED = /^No result found for routeId /;

function missing(path: string): Diagnostic {
  const lesson = path.startsWith("/lesson/");
  return {
    title: "Page not found",
    code: "error[404]",
    message: "no page at this address",
    location: path,
    help: lesson ? "lessons live at /lesson/<phase>/<slug>" : undefined,
    note: lesson
      ? "the link may be old, or the lesson isn't written yet"
      : "the link may be old, or mistyped",
    notFound: true,
  };
}

export function diagnose(error: unknown, path: string, dev: boolean): Diagnostic {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return missing(path);
    return {
      title: "Something went wrong",
      code: `error[${error.status}]`,
      message: "the page couldn't load",
      location: path,
      note: typeof error.data === "string" && error.data ? error.data : undefined,
      notFound: false,
    };
  }
  if (error instanceof Error && NOT_PRERENDERED.test(error.message)) return missing(path);
  if (error instanceof Error) {
    const list = dev && error.stack ? frames(error.stack) : [];
    return crashed(list[0]?.file ?? path, error.message, dev ? backtrace(list) : undefined);
  }
  return crashed(path, String(error));
}
