import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Components must take their colors from the theme tokens (CLAUDE.md rule 6),
// so both themes work everywhere. Generated shadcn/ui components are skipped:
// they're updated with the CLI, not by hand.
const root = resolve(process.cwd(), "app");
const skip = [join("components", "ui")];

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (skip.some((s) => relative(root, path).startsWith(s))) return [];
    if (entry.isDirectory()) return componentFiles(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const rawColor = [
  /#[0-9a-fA-F]{3,8}\b/, // hex literals, including var(--x, #fallback)
  /\b(?:rgb|rgba|hsl|hsla|oklch)\(/, // color functions
  new RegExp(
    `\\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via)-(?:${palette})-\\d{2,3}\\b`,
  ),
  /\b(?:bg|text|border)-(?:white|black)\b/,
];

describe("components use theme tokens", () => {
  const files = componentFiles(root);

  it("finds the components to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [relative(root, file), file]))("%s has no raw colors", (_, file) => {
    const source = readFileSync(file, "utf8");
    const hits = rawColor.flatMap((pattern) => source.match(pattern) ?? []);
    expect(hits).toEqual([]);
  });
});
