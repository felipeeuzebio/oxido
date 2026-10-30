import { describe, expect, it } from "vitest";
import { taskTitle } from "./task";

const stripe = (number: number) => ({ number, title: "a stripe" });

describe("taskTitle", () => {
  it("names the belt and its stripes", () => {
    expect(taskTitle({ kind: "stripes", belt: "white", stripes: [stripe(1)] })).toBe(
      "White belt, stripe 1",
    );
    expect(taskTitle({ kind: "stripes", belt: "purple", stripes: [stripe(3), stripe(4)] })).toBe(
      "Purple belt, stripes 3 and 4",
    );
    expect(
      taskTitle({ kind: "stripes", belt: "black", stripes: [stripe(1), stripe(2), stripe(3)] }),
    ).toBe("Black belt, stripes 1, 2 and 3");
  });

  it("names a drill", () => {
    expect(taskTitle({ kind: "drill", name: "unsafe" })).toBe("Drill: unsafe");
  });

  it("calls class 1's task the setup", () => {
    expect(taskTitle({ kind: "setup" })).toBe("Set up the course");
  });
});
