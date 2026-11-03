import { describe, expect, it } from "vitest";
import { createBrowserStorage, type Shelf } from "./browser";
import { contract } from "./contract";
import { memoryShelf as memory } from "./memory-shelf";
import { StorageError } from "./storage";

describe("the website's browser storage", () => {
  describe("keeps the storage contract", () => {
    for (const { name, run } of contract) {
      it(name, () => run(createBrowserStorage(memory())));
    }
  });

  it("lets the student mark a class's task done, and take the mark back", async () => {
    const storage = createBrowserStorage(memory());
    await storage.markTask("36-unsafe", true);
    let saved = (await storage.progress()).classes["36-unsafe"];
    expect([saved?.taskMarked, saved?.videoSeconds]).toEqual([true, 0]);
    expect(saved?.lastAt).toBeTruthy();
    await storage.markTask("36-unsafe", false);
    saved = (await storage.progress()).classes["36-unsafe"];
    expect(saved?.taskMarked).toBe(false);
  });

  it("refuses to mark a task with an ID that could climb out of a folder", async () => {
    await expect(createBrowserStorage(memory()).markTask("../x", true)).rejects.toBeInstanceOf(
      StorageError,
    );
  });

  it("never has earned stripes, since tests can't run on the website", async () => {
    const storage = createBrowserStorage(memory());
    await storage.saveVideo("01-getting-started", { watched: true });
    expect((await storage.progress()).stripes).toEqual({});
  });

  it("keeps progress for the next visit", async () => {
    const shelf = memory();
    await createBrowserStorage(shelf).saveVideo("01-getting-started", { seconds: 90 });
    const next = await createBrowserStorage(shelf).progress();
    expect(next.classes["01-getting-started"]?.videoSeconds).toBe(90);
  });

  it("starts over from progress it can't read", async () => {
    const shelf = memory();
    shelf.items.set("oxido:progress", "{not json");
    const storage = createBrowserStorage(shelf);
    expect((await storage.progress()).classes).toEqual({});
    await storage.saveVideo("01-getting-started", { seconds: 5 });
    expect((await storage.progress()).classes["01-getting-started"]?.videoSeconds).toBe(5);
  });

  it("still works for the visit when the browser keeps nothing", async () => {
    const storage = createBrowserStorage(undefined);
    await storage.saveVideo("01-getting-started", { seconds: 30 });
    expect((await storage.progress()).classes["01-getting-started"]?.videoSeconds).toBe(30);
  });

  it("says so when the browser refuses to save", async () => {
    const full: Shelf = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    await expect(
      createBrowserStorage(full).saveVideo("01-getting-started", { seconds: 1 }),
    ).rejects.toBeInstanceOf(StorageError);
  });
});
