import { describe, expect, it } from "vitest";
import { currentItem, railItems } from "./items";

describe("railItems", () => {
  it("has the roadmap and, once a lesson exists, the lesson", () => {
    expect(railItems("/lesson/p01/01-getting-started").map(({ label, to }) => [label, to])).toEqual(
      [
        ["Roadmap", "/"],
        ["Lesson", "/lesson/p01/01-getting-started"],
      ],
    );
  });

  it("leaves the lesson out while no lesson is compiled", () => {
    expect(railItems(null).map((item) => item.label)).toEqual(["Roadmap"]);
  });
});

describe("currentItem", () => {
  const items = railItems("/lesson/p01/01-getting-started");

  it("is the roadmap on the home page", () => {
    expect(currentItem(items, "/")?.label).toBe("Roadmap");
  });

  it("is the lesson on any lesson, not only the one the item links to", () => {
    expect(currentItem(items, "/lesson/p02/04-structs")?.label).toBe("Lesson");
  });

  it("is nothing on a page the rail doesn't list", () => {
    expect(currentItem(items, "/no/such/page")).toBeUndefined();
  });
});
