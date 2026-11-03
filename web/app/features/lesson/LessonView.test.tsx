import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goldenLesson } from "../content/golden";
import type { Lesson } from "../content/types";
import { finishLoading } from "../player/fake-youtube";
import { NO_PROGRESS, type Progress } from "../progress/progress";
import { createBrowserStorage } from "../storage/browser";
import { memoryShelf } from "../storage/memory-shelf";
import type { CourseStorage, OxidoStorage } from "../storage/storage";

// The compiler's golden lesson: "Hello, Cargo", the first class of phase 1,
// whose task is the white belt's stripes 1 and 2.
const place = { phase: "Phase 1", phaseTitle: "First Steps", label: "Class 1.1" };

async function show(lesson: Lesson = goldenLesson, pick?: () => Promise<CourseStorage>) {
  vi.resetModules();
  const { LessonView } = await import("./LessonView");
  // Imported after the reset too, so the page and the provider share one context.
  const { ProgressProvider } = await import("../progress/ProgressProvider");
  const page = <LessonView lesson={lesson} place={place} />;
  return render(
    <MemoryRouter>
      {pick ? <ProgressProvider pick={pick}>{page}</ProgressProvider> : page}
    </MemoryRouter>,
  );
}

/** oxido's storage holding this progress, as the stripes' tests would leave it. */
const oxidoWith = (progress: Progress): OxidoStorage => ({
  target: "oxido",
  progress: async () => progress,
  saveVideo: async () => {},
  saveQuiz: async () => {},
});

const PASSED = "2026-10-01T10:00:00.000Z";

const playButton = () => screen.queryByRole("button", { name: /Play video/ });
const task = () => screen.getByRole("region", { name: /belt|Drill|Set up/ });

async function startVideo() {
  fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
  const { players } = finishLoading();
  await waitFor(() => expect(players).toHaveLength(1));
  act(() => players[0].ready());
  return players[0];
}

beforeEach(() => {
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

  it("shows the video, then the class's task: its stripes and the brief", async () => {
    await show();
    expect(playButton()).toBeTruthy();
    const region = task();
    expect(within(region).getByRole("heading", { level: 2 }).textContent).toBe(
      "White belt, stripes 1 and 2",
    );
    const stripes = within(region).getAllByRole("listitem");
    expect(stripes.map((stripe) => stripe.textContent)).toEqual([
      "Stripe 1a prompt that reads lines",
      "Stripe 2.exit ends the program",
    ]);
    const brief = within(region).getByRole("article", { name: "Brief" });
    expect(brief.textContent).toContain("Cargo builds and runs a project.");
  });

  it("names a drill as the task, with no stripes", async () => {
    await show({ ...goldenLesson, task: { kind: "drill", name: "shadowing" } });
    expect(within(task()).getByRole("heading", { level: 2 }).textContent).toBe("Drill: shadowing");
    expect(within(task()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("calls class 1's task the setup", async () => {
    await show({ ...goldenLesson, task: { kind: "setup" } });
    expect(within(task()).getByRole("heading", { level: 2 }).textContent).toBe("Set up the course");
  });

  describe("the task's state", () => {
    it("shows the task done once its stripes are earned, with nothing to mark", async () => {
      const earned = { ...NO_PROGRESS, stripes: { "white.1": PASSED, "white.2": PASSED } };
      await show(goldenLesson, async () => oxidoWith(earned));
      expect(await within(task()).findByText("Done")).toBeTruthy();
      expect(within(task()).queryByRole("button", { name: /Mark as/ })).toBeNull();
    });

    it("lets a student on the website mark the task done, and take the mark back", async () => {
      await show(goldenLesson, async () => createBrowserStorage(memoryShelf()));
      fireEvent.click(await within(task()).findByRole("button", { name: "Mark as done" }));
      expect(await within(task()).findByText("Done")).toBeTruthy();
      fireEvent.click(within(task()).getByRole("button", { name: "Mark as not done" }));
      await waitFor(() => expect(within(task()).queryByText("Done")).toBeNull());
    });
  });

  it("keeps the video and the task on one page, with no view to switch to", async () => {
    await show();
    expect(screen.queryByRole("group", { name: "View" })).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  describe("a hint", () => {
    // The golden lesson's hint, "the demo", links outline point 2, at 01:30.
    const time = () => screen.getByRole("link", { name: "the demo, in the video from 01:30" });

    it("starts the video from that moment", async () => {
      await show();
      fireEvent.click(time());
      const { players } = finishLoading();
      await waitFor(() => expect(players).toHaveLength(1));
      act(() => players[0].ready());
      expect(players[0].time).toBe(90);
      expect(players[0].playRequested).toBe(true);
    });

    it("moves a video that's already playing to that moment", async () => {
      await show();
      const player = await startVideo();
      player.playRequested = false;
      fireEvent.click(time());
      expect(player.time).toBe(90);
      expect(player.playRequested).toBe(true);
    });

    it("still plays from that moment when clicked while YouTube's player loads", async () => {
      await show();
      fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
      fireEvent.click(time());
      const { players } = finishLoading();
      await waitFor(() => expect(players).toHaveLength(1));
      act(() => players[0].ready());
      expect(players[0].time).toBe(90);
    });
  });

  it("puts the video's chapters on the strip under it", async () => {
    await show();
    expect(
      screen
        .getAllByRole("button", { name: /^Chapter: / })
        .map((chapter) => chapter.getAttribute("aria-label")),
    ).toEqual([
      "Chapter: Hello, Cargo, 00:10",
      "Chapter: Your first program, 01:30",
      "Chapter: Your first program, 02:40",
    ]);
  });
});
