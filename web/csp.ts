// The content security policy, written into every pre-rendered page once the
// build is done (`bun run build` runs this file last). GitHub Pages can't send
// headers, so the policy rides in a <meta> tag, and both targets serve the same
// HTML. Each page's inline scripts (the theme, React Router's data and loader)
// differ, so each page lists its own by hash: no 'unsafe-inline' for scripts.
// `oxido` adds `frame-ancestors 'none'` as a header, which a <meta> can't carry.
// What YouTube needs: docs/architecture.md, "YouTube embeds".
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SOURCES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://www.youtube.com"],
  // React and Radix set style attributes (a progress bar's width, a belt's
  // length), which only 'unsafe-inline' allows; the stylesheet is a file.
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "https://i.ytimg.com"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "frame-src": ["https://www.youtube.com"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

// An inline script: a <script> with no src, and its code.
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const POLICY_META = /<meta http-equiv="Content-Security-Policy" content="[^"]*"\/>/g;
const CHARSET = /<meta charSet="utf-8"\/>/i;

const sha256 = (code: string) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;

/** The policy for one page: the shared sources, plus its own inline scripts by hash. */
export function policyFor(html: string): string {
  const hashes = new Set([...html.matchAll(INLINE_SCRIPT)].map(([, code]) => sha256(code)));
  const sources = { ...SOURCES, "script-src": [...SOURCES["script-src"], ...hashes] };
  return Object.entries(sources)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

/** The page with its policy right after the charset, ahead of every script. */
export function withPolicy(html: string): string {
  const page = html.replace(POLICY_META, "");
  const charset = CHARSET.exec(page);
  if (!charset) throw new Error("no <meta charset> to put the content security policy after");
  const at = charset.index + charset[0].length;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(page)}"/>`;
  return page.slice(0, at) + meta + page.slice(at);
}

function* pages(folder: string): Generator<string> {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) yield* pages(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

if (import.meta.main) {
  const client = resolve(import.meta.dirname, "build/client");
  let count = 0;
  for (const path of pages(client)) {
    writeFileSync(path, withPolicy(readFileSync(path, "utf8")));
    count++;
  }
  if (count === 0) throw new Error(`no pages in ${client}: run the build first`);
  console.log(`Added the content security policy to ${count} pages.`);
}
