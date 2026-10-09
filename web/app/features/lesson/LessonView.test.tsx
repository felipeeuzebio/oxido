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

  describe("a time in the text", () => {
    // jsdom drops the space before the label that browsers keep.
    const time = () => screen.getByRole("link", { name: /^0:42 ?\(plays the video from 0:42\)$/ });

    it("starts the video from that moment", async () => {
      await show();
      fireEvent.click(time());
      const { players } = finishLoading();
      await waitFor(() => expect(players).toHaveLength(1));
      act(() => players[0].ready());
      expect(players[0].time).toBe(42);
      expect(players[0].playRequested).toBe(true);
    });

    it("moves a video that's already playing to that moment", async () => {
      await show();
      const player = await startVideo();
      player.playRequested = false;
      fireEvent.click(time());
      expect(player.time).toBe(42);
      expect(player.playRequested).toBe(true);
    });

    it("still plays from that moment when clicked while YouTube's player loads", async () => {
      await show();
      fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
      fireEvent.click(time());
      const { players } = finishLoading();
      await waitFor(() => expect(players).toHaveLength(1));
      act(() => players[0].ready());
      expect(players[0].time).toBe(42);
    });

    it("brings the video back from Text view to play it", async () => {
      await show();
      fireEvent.click(view("Text"));
      fireEvent.click(time());
      expect(view("Both").getAttribute("aria-checked")).toBe("true");
      const { players } = finishLoading();
      await waitFor(() => expect(players).toHaveLength(1));
      act(() => players[0].ready());
      expect(players[0].time).toBe(42);
    });
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
