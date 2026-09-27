import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("is one button named Dark theme, pressed while the dark theme shows", () => {
    const { rerender } = render(<ThemeToggle dark={false} onToggle={() => {}} />);
    const button = screen.getByRole("button", { name: "Dark theme" });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    rerender(<ThemeToggle dark onToggle={() => {}} />);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("has no light / dark / system choice anymore: system is only the default", () => {
    render(<ThemeToggle dark={false} onToggle={() => {}} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("asks to toggle when pressed", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
