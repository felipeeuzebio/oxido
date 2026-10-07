import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import golden from "../../../../crates/oxido-content/tests/golden/course.json";
import type { Course } from "../content/types";
import { Roadmap } from "./Roadmap";
import type { Progress } from "./roadmap";

// The compiler's fixture course: a kickoff, then the white belt (p01, two
// stripes and both lessons) and the yellow belt (p02, one stripe, no lessons).
const course: Course = golden;

function show(progress?: Progress, of: Course = course) {
  render(
    <MemoryRouter>
      <Roadmap course={of} progress={progress} />
    </MemoryRouter>,
  );
}

const section = (name: string) => screen.getByRole("region", { name });

describe("the roadmap", () => {
  it("names the path from the first belt to the last and counts the stripes earned", () => {
    show({ stripes: { p01: 1 } });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "From white belt to yellow belt",
    );
    expect(screen.getByText(/1 of 3 stripes earned on minisql/)).toBeTruthy();
  });

  describe("the long belt", () => {
    const sentences = () =>
      within(section("Belts"))
        .getAllByRole("listitem")
        .map((item) => item.querySelector(".sr-only")?.textContent);

    it("reads each belt to screen readers as one sentence, in order", () => {
      show();
      expect(sentences()).toEqual([
        "White belt: 0 of 2 stripes, you are here",
        "Yellow belt: 0 of 1 stripe",
      ]);
    });

    it("seals an earned belt and moves the mark to the next", () => {
      show({ stripes: { p01: 2 } });
      expect(sentences()).toEqual([
        "White belt: 2 of 2 stripes, earned",
        "Yellow belt: 0 of 1 stripe, you are here",
      ]);
    });

    it("keeps the colors and stripe bars from screen readers", () => {
      show();
      for (const item of within(section("Belts")).getAllByRole("listitem")) {
        const shown = [...item.children].filter((child) => !child.classList.contains("sr-only"));
        expect(shown.length).toBeGreaterThan(0);
        expect(shown.every((child) => child.getAttribute("aria-hidden") === "true")).toBe(true);
      }
    });

    it("gives each belt a width in proportion to its stripes", () => {
      show();
      const widths = within(section("Belts"))
        .getAllByRole("listitem")
        .map((item) => item.style.getPropertyValue("--stripes"));
      expect(widths).toEqual(["2", "1"]);
    });
  });

  describe("the Continue card", () => {
    it("starts with the first lesson and the stripe it leads to", () => {
      show();
      const card = section("Hello, Cargo");
      expect(within(card).getByText("Start here")).toBeTruthy();
      expect(within(card).getByText("Phase 1, First Steps, ch. 1, 3.")).toBeTruthy();
      expect(within(card).getByRole("link", { name: "Open the lesson" }).getAttribute("href")).toBe(
        "/lesson/p01/01-hello",
      );
      expect(within(card).getByText("Stripe 1 of 2, white belt")).toBeTruthy();
      expect(within(card).getByText("a prompt that reads lines")).toBeTruthy();
    });

    it("says continue once a stripe is earned", () => {
      show({ stripes: { p01: 1 } });
      expect(within(section("Hello, Cargo")).getByText("Continue")).toBeTruthy();
    });

    it("isn't there before any lesson is written", () => {
      const unwritten = {
        ...course,
        phases: course.phases.map((phase) => ({ ...phase, lessons: [] })),
      };
      show(undefined, unwritten);
      expect(screen.queryByRole("link", { name: "Open the lesson" })).toBeNull();
    });
  });

  describe("the phases", () => {
    const cards = () => within(section("Phases")).getAllByRole("listitem");

    it("shows a card per phase with its title, chapters, belt and summary", () => {
      show();
      expect(cards().map((card) => within(card).getByRole("heading").textContent)).toEqual([
        "Kickoff",
        "First Steps",
        "Ownership",
      ]);
      const p01 = cards()[1];
      expect(within(p01).getByText("Phase 1, ch. 1, 3")).toBeTruthy();
      expect(within(p01).getByText("White belt")).toBeTruthy();
      expect(within(p01).getByText("2 stripes")).toBeTruthy();
      // The summary's `db > ` is code.
      expect(p01.querySelector("code")?.textContent).toBe("db > ");
    });

    it("marks where each phase stands", () => {
      const status = () =>
        cards().map((card) => card.querySelector("[data-slot=badge]")?.textContent);
      show();
      expect(status()).toEqual([undefined, "Up next", "Not started"]);
    });

    it("counts a started phase's stripes and calls it in progress", () => {
      show({ stripes: { p01: 1 } });
      const p01 = cards()[1];
      expect(within(p01).getByText("In progress")).toBeTruthy();
      expect(within(p01).getByText("1 of 2 stripes")).toBeTruthy();
    });

    it("calls a phase done once its stripes are earned", () => {
      show({ stripes: { p01: 2 } });
      expect(within(cards()[1]).getByText("Done")).toBeTruthy();
    });
  });
});
