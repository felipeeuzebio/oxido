import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import lesson from "../../../../crates/oxido-content/tests/golden/lesson.json";
import { finishLoading } from "../player/fake-youtube";

// The compiler's golden lesson: "Hello, Cargo", the first class of phase 1.
const place = { phase: "Phase 1", phaseTitle: "First Steps", label: "Class 1.1" };

async function show() {
  vi.resetModules();
  const { LessonView } = await import("./LessonView");
  return render(
    <MemoryRouter>
      <LessonView lesson={lesson} place={place} />
    </MemoryRouter>,
  );
}

const view = (name: "Video" | "Both" | "Text") => screen.getByRole("radio", { name });
const playButton = () => screen.queryByRole("button", { name: /Play video/ });
const text = () => screen.queryByRole("article", { name: "Text lesson" });

async function startVideo() {
  fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
  const { players } = finishLoading();
  await waitFor(() => expect(players).toHaveLength(1));
  act(() => players[0].ready());
  return players[0];
}

beforeEach(() => {
  localStorage.clear();
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
  for (const script of document.head.querySelectorAll("script")) script.remove();
});

describe("LessonView", () => {
  it("says where the class sits, with a way back to the roadmap", async () => {
    await show();
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Roadmap" }).getAttribute("href")).toBe("/");
    expect(within(trail).getByText("Class 1.1").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hello, Cargo");
  });

  it("opens in Both view, with the video and the text", async () => {
    await show();
    expect(view("Both").getAttribute("aria-checked")).toBe("true");
    expect(playButton()).toBeTruthy();
    expect(text()).toBeTruthy();
  });

  it("shows the text alone in Text view, and takes the player down", async () => {
    await show();
    const player = await startVideo();
    fireEvent.click(view("Text"));
    expect(text()).toBeTruthy();
    expect(screen.queryByTitle("YouTube video player")).toBeNull();
    expect(player.destroyed).toBe(true);
  });

  it("hides the text in Video view and keeps the video playing", async () => {
    await show();
    const player = await startVideo();
    fireEvent.click(view("Video"));
    expect(text()).toBeNull();
    fireEvent.click(view("Both"));
    expect(text()).toBeTruthy();
    expect(player.destroyed).toBe(false);
    expect(screen.getByTitle("YouTube video player")).toBe(player.frame);
  });

  it("remembers the view for the next class", async () => {
    const first = await show();
    fireEvent.click(view("Text"));
    first.unmount();
    await show();
    await waitFor(() => expect(view("Text").getAttribute("aria-checked")).toBe("true"));
    expect(playButton()).toBeNull();
  });
});
