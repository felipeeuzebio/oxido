import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createBrowserStorage } from "../storage/browser";
import { memoryShelf } from "../storage/memory-shelf";
import { type CourseStorage, type OxidoStorage, StorageError } from "../storage/storage";
import { ProgressAlert } from "./ProgressAlert";
import { ProgressProvider, useProgress } from "./ProgressProvider";

/** What a page reads from the provider, and one change it can make. */
function Shows() {
  const { state, progress, saveVideo } = useProgress();
  return (
    <div>
      <p>{state.status}</p>
      <p>{JSON.stringify(progress.classes)}</p>
      <button type="button" onClick={() => saveVideo("01-hello", { seconds: 90 })}>
        save
      </button>
    </div>
  );
}

const show = (pick: () => Promise<CourseStorage>) =>
  render(
    <ProgressProvider pick={pick}>
      <ProgressAlert />
      <Shows />
    </ProgressProvider>,
  );

/** oxido's storage, answering every request with one error, as it does without a session. */
const refusing = (error: StorageError): OxidoStorage => ({
  target: "oxido",
  progress: async () => Promise.reject(error),
  saveVideo: async () => Promise.reject(error),
  saveQuiz: async () => Promise.reject(error),
});

describe("ProgressProvider", () => {
  it("loads the progress from the storage it picks", async () => {
    const storage = createBrowserStorage(memoryShelf());
    await storage.saveVideo("01-hello", { seconds: 42 });
    show(async () => storage);
    expect(await screen.findByText("ready")).toBeTruthy();
    expect(screen.getByText(/"videoSeconds":42/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("has no progress to show while it loads", () => {
    show(() => new Promise(() => {}));
    expect(screen.getByText("loading")).toBeTruthy();
    expect(screen.getByText("{}")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("saves a change and shows the progress that follows it", async () => {
    show(async () => createBrowserStorage(memoryShelf()));
    await screen.findByText("ready");
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(await screen.findByText(/"videoSeconds":90/)).toBeTruthy();
  });

  it("says why when the progress can't load", async () => {
    show(async () =>
      refusing(new StorageError(401, "open the link oxido printed in your terminal")),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Your progress isn't being saved");
    expect(alert.textContent).toContain("Open the link oxido printed in your terminal.");
  });

  it("says why when a change can't be saved", async () => {
    const storage = createBrowserStorage(memoryShelf());
    const full = {
      ...storage,
      saveVideo: async () => Promise.reject(new StorageError(507, "The browser wouldn't keep it.")),
    };
    show(async () => full);
    await screen.findByText("ready");
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "The browser wouldn't keep it.",
    );
  });
});
