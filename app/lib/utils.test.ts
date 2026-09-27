import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and drops falsy ones", () => {
    expect(cn("flex", false && "hidden", undefined, "gap-2")).toBe("flex gap-2");
  });

  it("lets a later Tailwind class override an earlier one", () => {
    expect(cn("px-2 text-muted-foreground", "px-4")).toBe("text-muted-foreground px-4");
  });
});
