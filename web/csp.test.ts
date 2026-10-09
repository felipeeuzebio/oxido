// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { policyFor, withPolicy } from "./csp.ts";

// A pre-rendered page the way React Router writes one: two inline scripts and
// one from a file.
const PAGE = [
  "<!DOCTYPE html>",
  '<html lang="en"><head><meta charSet="utf-8"/><title>Oxidō</title>',
  "<script>(() => { document.documentElement.classList.add('dark'); })()</script>",
  "</head><body><main></main>",
  '<script type="module" async="">import "/assets/manifest-1.js";</script>',
  '<script src="/assets/vendor.js"></script>',
  "</body></html>",
].join("");

const hash = (code: string) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("policyFor", () => {
  it("allows each inline script on the page by its hash, and no other inline script", () => {
    const scripts = directive(policyFor(PAGE), "script-src");
    expect(scripts).toEqual([
      "'self'",
      "https://www.youtube.com",
      hash("(() => { document.documentElement.classList.add('dark'); })()"),
      hash('import "/assets/manifest-1.js";'),
    ]);
    expect(scripts).not.toContain("'unsafe-inline'");
  });

  it("lets in YouTube's script, player and thumbnails, and nothing else from outside", () => {
    const policy = policyFor(PAGE);
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
    expect(directive(policy, "frame-src")).toEqual(["https://www.youtube.com"]);
    expect(directive(policy, "img-src")).toEqual(["'self'", "https://i.ytimg.com"]);
    expect(directive(policy, "connect-src")).toEqual(["'self'"]);
    expect(directive(policy, "font-src")).toEqual(["'self'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
  });
});

describe("withPolicy", () => {
  it("puts the policy right after the charset, ahead of every script it governs", () => {
    const page = withPolicy(PAGE);
    const meta = page.indexOf('<meta http-equiv="Content-Security-Policy"');
    expect(meta).toBe(page.indexOf('<meta charSet="utf-8"/>') + '<meta charSet="utf-8"/>'.length);
    expect(meta).toBeLessThan(page.indexOf("<script"));
    expect(page).toContain(`content="${policyFor(PAGE)}"`);
  });

  it("replaces the policy an earlier run added, so the build can run it again", () => {
    const once = withPolicy(PAGE);
    expect(withPolicy(once)).toBe(once);
    expect(once.match(/Content-Security-Policy/g)).toHaveLength(1);
  });

  it("refuses a page it can't place the policy in", () => {
    expect(() => withPolicy("<p>no head here</p>")).toThrow("no <meta charset>");
  });
});
