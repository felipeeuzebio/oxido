import { describe, expect, it } from "vitest";
import type { PhaseLessons } from "../content/types";
import { paletteGroups } from "./entries";

const lessons: PhaseLessons[] = [
  {
    id: "kickoff",
    title: "Kickoff: what we'll build",
    lessons: [{ title: "The tour", route: "/lesson/kickoff/00-tour" }],
  },
  {
    id: "p01",
    title: "First Steps",
    lessons: [
      { title: "Getting started", route: "/lesson/p01/01-getting-started" },
      { title: "Hello, Cargo", route: "/lesson/p01/02-hello-cargo" },
    ],
  },
];

describe("paletteGroups", () => {
  it("lists the pages, then each phase's lessons under its name, then the theme", () => {
    const groups = paletteGroups(lessons, "light");
    expect(
      groups.map((group) => [group.heading, group.entries.map((entry) => entry.label)]),
    ).toEqual([
      ["Pages", ["Roadmap"]],
      ["Kickoff: what we'll build", ["The tour"]],
      ["Phase 1: First Steps", ["Getting started", "Hello, Cargo"]],
      ["Theme", ["Switch to dark theme"]],
    ]);
  });

  it("links each lesson, and lets its phase find it", () => {
    const p01 = paletteGroups(lessons, "light")[2];
    expect(p01.entries[0]).toMatchObject({
      to: "/lesson/p01/01-getting-started",
      keywords: ["Phase 1", "First Steps"],
    });
  });

  it("links the roadmap home", () => {
    expect(paletteGroups([], "light")[0].entries[0]).toMatchObject({ label: "Roadmap", to: "/" });
  });

  it("offers the theme that isn't showing", () => {
    expect(paletteGroups([], "dark").at(-1)?.entries[0].label).toBe("Switch to light theme");
  });
});
