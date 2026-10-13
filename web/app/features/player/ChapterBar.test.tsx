import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChapterBar } from "./ChapterBar";

const CHAPTERS = [
  { title: "Getting started", id: null, start: 28 },
  { title: "Install Rust", id: "install-rust", start: 52 },
  { title: "Cargo", id: "cargo", start: 234 },
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

// jsdom has no layout, so each segment gets a box: 0 to 200px across.
function place(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ left: 0, width: 200, top: 0, height: 24, right: 200, bottom: 24, x: 0, y: 0 }) as DOMRect;
  return element;
}

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
    fireEvent.pointerMove(place(segment("Install Rust, 00:52")), { clientX: 100 });
    expect(tip()?.textContent).toBe("Install Rust02:23");
    fireEvent.pointerLeave(segment("Install Rust, 00:52"));
    expect(tip()).toBeNull();
  });

  it("plays from the point clicked", () => {
    const onSeek = show();
    fireEvent.click(place(segment("Install Rust, 00:52")), { clientX: 100, detail: 1 });
    expect(onSeek).toHaveBeenCalledWith(143);
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
