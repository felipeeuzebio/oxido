import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChapterBar } from "./ChapterBar";

const CHAPTERS = [
  { title: "Getting started", start: 28 },
  { title: "Install Rust", start: 52 },
  { title: "Cargo", start: 234 },
];

function show(time = 0) {
  const onSeek = vi.fn();
  render(
    <ChapterBar
      title="Getting started"
      chapters={CHAPTERS}
      length={430}
      time={time}
      onSeek={onSeek}
    />,
  );
  return onSeek;
}

const segment = (name: string) => screen.getByRole("button", { name: `Chapter: ${name}` });

// jsdom has no layout, so a segment gets a box by hand: 200px wide from `left`.
function place(element: HTMLElement, left = 0) {
  element.getBoundingClientRect = () =>
    ({
      left,
      width: 200,
      top: 0,
      height: 24,
      right: left + 200,
      bottom: 24,
      x: left,
      y: 0,
    }) as DOMRect;
  return element;
}

// All three segments side by side, 2px apart: 0, 202 and 404px from the left.
function layOut() {
  place(segment("Getting started, 00:28"), 0);
  place(segment("Install Rust, 00:52"), 202);
  place(segment("Cargo, 03:54"), 404);
}

const bar = () => screen.getByRole("list", { name: "Chapters" });
const played = (name: string) =>
  (segment(name).querySelector("[data-slot=played]") as HTMLElement).style.width;

const tip = () => document.querySelector("[data-slot=chapter-tip]");

describe("ChapterBar", () => {
  it("splits the strip into a segment per chapter, each as long as its part of the video", () => {
    show();
    const grow = ["Getting started, 00:28", "Install Rust, 00:52", "Cargo, 03:54"].map(
      (name) => segment(name).closest("li")?.style.flexGrow,
    );
    expect(grow).toEqual(["52", "182", "196"]);
  });

  it("fills what has played across the segments", () => {
    show(143);
    const played = ["Getting started, 00:28", "Install Rust, 00:52", "Cargo, 03:54"].map(
      (name) => (segment(name).querySelector("[data-slot=played]") as HTMLElement).style.width,
    );
    expect(played).toEqual(["100%", "50%", "0%"]);
  });

  it("names the chapter and the time under the pointer", () => {
    show();
    layOut();
    fireEvent.pointerMove(segment("Install Rust, 00:52"), { clientX: 302 });
    expect(tip()?.textContent).toBe("Install Rust02:23");
    fireEvent.pointerLeave(bar());
    expect(tip()).toBeNull();
  });

  it("plays from the point clicked", () => {
    const onSeek = show();
    layOut();
    fireEvent.pointerDown(segment("Install Rust, 00:52"), { clientX: 302, button: 0 });
    fireEvent.pointerUp(bar(), { clientX: 302 });
    fireEvent.click(segment("Install Rust, 00:52"), { clientX: 302, detail: 1 });
    expect(onSeek.mock.calls).toEqual([[143]]);
  });

  it("follows a drag across chapters and plays from where it's let go", () => {
    const onSeek = show(100);
    layOut();
    fireEvent.pointerDown(segment("Install Rust, 00:52"), { clientX: 302, button: 0 });
    fireEvent.pointerMove(bar(), { clientX: 504 });
    expect(onSeek).not.toHaveBeenCalled();
    expect(tip()?.textContent).toBe("Cargo05:32");
    expect([played("Install Rust, 00:52"), played("Cargo, 03:54")]).toEqual(["100%", "50%"]);

    fireEvent.pointerUp(bar(), { clientX: 504 });
    expect(onSeek.mock.calls).toEqual([[332]]);
    expect(played("Cargo, 03:54")).toBe("0%");
  });

  it("plays nothing when a drag is cancelled, as when the page scrolls instead", () => {
    const onSeek = show();
    layOut();
    fireEvent.pointerDown(segment("Install Rust, 00:52"), { clientX: 302, button: 0 });
    fireEvent.pointerCancel(bar());
    fireEvent.pointerUp(bar(), { clientX: 302 });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("shows a handle at the playhead while the pointer is on the bar", () => {
    show(143);
    layOut();
    const handle = () => document.querySelector<HTMLElement>("[data-slot=handle]");
    expect(handle()).toBeNull();
    fireEvent.pointerMove(segment("Cargo, 03:54"), { clientX: 420 });
    expect(segment("Install Rust, 00:52").contains(handle())).toBe(true);
    expect(handle()?.style.left).toBe("50%");
  });

  it("plays a chapter from its start when picked with the keyboard", () => {
    const onSeek = show();
    fireEvent.click(segment("Install Rust, 00:52"), { detail: 0 });
    expect(onSeek).toHaveBeenCalledWith(52);
  });

  it("names a chapter when its segment has focus", () => {
    show();
    fireEvent.focus(segment("Cargo, 03:54"));
    expect(tip()?.textContent).toBe("Cargo03:54");
  });

  it("tells screen readers where the video is", () => {
    show(143);
    const position = screen.getByRole("progressbar", { name: "Position in the video" });
    expect(position.getAttribute("aria-valuetext")).toBe("02:23 of 07:10");
  });
});
