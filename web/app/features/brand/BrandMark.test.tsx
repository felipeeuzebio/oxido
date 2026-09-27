import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("links home under the name Oxidō", () => {
    render(<BrandMark />);
    const link = screen.getByRole("link", { name: "Oxidō" });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("shows the logo alone: the name lives in the page title, not next to the logo", () => {
    render(<BrandMark />);
    const link = screen.getByRole("link", { name: "Oxidō" });
    expect(link.textContent).toBe("");
    const logo = screen.getByRole("img", { name: "Oxidō" });
    expect(logo.getAttribute("src")).toBe("/logo.svg");
  });
});
