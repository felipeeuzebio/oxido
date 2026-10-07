import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Diagnostic } from "./diagnostic";
import { ErrorPage } from "./ErrorPage";

const notFound: Diagnostic = {
  title: "Page not found",
  code: "error[404]",
  message: "no page at this address",
  location: "/lesson/p01/99-nope",
  help: "lessons live at /lesson/<phase>/<slug>",
  note: "the link may be old, or the lesson isn't written yet",
  notFound: true,
};

const panic: Diagnostic = {
  title: "Something went wrong",
  code: "error",
  message: "this page panicked",
  location: "app/routes/lesson.tsx:18:11",
  note: "Cannot read properties of undefined (reading 'title')",
  backtrace: "   0: LessonPage\n             at app/routes/lesson.tsx:18:11",
  notFound: false,
};

const actions = () =>
  screen
    .getAllByRole("link")
    .concat(screen.getAllByRole("button"))
    .map((el) => ({
      name: el.textContent,
      primary: el.dataset.variant === "default",
    }));

describe("ErrorPage", () => {
  it("shows the panicking crab, the title and the error as rustc would print it", () => {
    render(<ErrorPage diagnostic={notFound} onRetry={() => {}} />);
    expect(screen.getByRole("img", { name: "Ferris the crab, panicking" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    const printed = screen.getByLabelText("Error details").textContent;
    expect(printed).toBe(
      [
        "error[404]: no page at this address",
        "  --> /lesson/p01/99-nope",
        "   |",
        "   = help: lessons live at /lesson/<phase>/<slug>",
        "   = note: the link may be old, or the lesson isn't written yet",
      ].join("\n"),
    );
  });

  it("leads with the roadmap on a missing page, and with trying again after a crash", () => {
    render(<ErrorPage diagnostic={notFound} onRetry={() => {}} />);
    expect(actions().find((a) => a.primary)?.name).toBe("Go to the roadmap");
    render(<ErrorPage diagnostic={panic} onRetry={() => {}} />);
    expect(screen.getAllByRole("button", { name: "Try again" }).at(-1)?.dataset.variant).toBe(
      "default",
    );
  });

  it("shows a backtrace only when there is one", () => {
    const { unmount } = render(<ErrorPage diagnostic={notFound} onRetry={() => {}} />);
    expect(screen.queryByText("Backtrace (only in development)")).toBeNull();
    unmount();
    render(<ErrorPage diagnostic={panic} onRetry={() => {}} />);
    expect(screen.getByText("Backtrace (only in development)")).toBeTruthy();
    expect(
      screen.getByText(/at app\/routes\/lesson\.tsx:18:11/, { selector: "details pre" }),
    ).toBeTruthy();
  });

  it("tries again when asked", () => {
    const onRetry = vi.fn();
    render(<ErrorPage diagnostic={panic} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
