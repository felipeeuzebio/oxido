import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Read from disk: Vitest turns CSS imports (even ?raw) into empty strings.
const css = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");

// Pulls "--name: value;" pairs out of the block that follows `selector {`.
function block(selector: string): Map<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no block for ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const vars = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars.set(match[1], match[2].trim());
  }
  return vars;
}

// WCAG 2 contrast ratio between two #rrggbb colors.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const light = block(":root");
const dark = block(".dark");
const tailwind = block("@theme inline");

// The variables shadcn/ui components read, plus our own additions.
const shadcn = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
];
const ours = ["--info", "--success", "--warning", "--code", "--code-foreground", "--belt-black"];

const colors = (vars: Map<string, string>) =>
  [...vars.keys()].filter((name) => name !== "--radius").sort();

describe("theme tokens", () => {
  it("defines every variable shadcn/ui components expect", () => {
    for (const name of shadcn) expect(light.has(name), name).toBe(true);
  });

  it("keeps the Dojo and Forge extras", () => {
    for (const name of ours) expect(light.has(name), name).toBe(true);
  });

  it("defines the same colors in light and dark", () => {
    expect(colors(dark)).toEqual(colors(light));
  });

  it("actually changes the palette in dark mode", () => {
    expect(dark.get("--background")).not.toBe(light.get("--background"));
    expect(dark.get("--foreground")).not.toBe(light.get("--foreground"));
  });

  it("registers every color with Tailwind", () => {
    for (const name of colors(light)) {
      const utility = `--color-${name.slice(2)}`;
      expect(tailwind.get(utility), utility).toBe(`var(${name})`);
    }
  });

  it("keeps the Dojo values", () => {
    expect(light.get("--background")).toBe("#f4f1e8");
    expect(light.get("--primary")).toBe("#c04218");
    expect(light.get("--info")).toBe("#243f6b");
    expect(dark.get("--background")).toBe("#121110");
    expect(dark.get("--primary")).toBe("#ec6a44");
  });

  it("colors code like VS Code's Light Modern and Dark Modern", () => {
    expect(light.get("--code")).toBe("#ffffff");
    expect(light.get("--code-keyword")).toBe("#0000ff");
    expect(dark.get("--code")).toBe("#1f1f1f");
    expect(dark.get("--code-keyword")).toBe("#569cd6");
  });

  it("keeps every code color readable (WCAG AA) where it's used", () => {
    const syntax = [
      "foreground",
      "keyword",
      "control",
      "type",
      "function",
      "variable",
      "constant",
      "string",
      "number",
      "comment",
    ];
    const terminal = ["foreground", "muted-foreground", "pass", "fail"];
    for (const [theme, vars] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      const color = (name: string) => vars.get(`--code-${name}`) ?? "";
      for (const name of syntax) {
        expect(
          contrast(color(name), vars.get("--code") ?? ""),
          `${theme} ${name} on --code`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const name of terminal) {
        expect(
          contrast(color(name), color("panel")),
          `${theme} ${name} on --code-panel`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("draws the rail's edge in the same rust as the buttons, in both themes", () => {
    expect(light.get("--sidebar-primary")).toBe(light.get("--primary"));
    expect(dark.get("--sidebar-primary")).toBe(dark.get("--primary"));
  });
});
