import { describe, expect, it } from "vitest";
import { savedView, saveView } from "./views";

describe("the lesson view", () => {
  it("is Both until the student picks another", () => {
    expect(savedView(new MemoryStorage())).toBe("both");
  });

  it("is remembered once picked", () => {
    const storage = new MemoryStorage();
    saveView("text", storage);
    expect(storage.getItem("oxido:view")).toBe("text");
    expect(savedView(storage)).toBe("text");
  });

  it("ignores a stored value that isn't a view", () => {
    const storage = new MemoryStorage();
    storage.setItem("oxido:view", "cinema");
    expect(savedView(storage)).toBe("both");
  });

  it("works without storage, as in a private window that refuses it", () => {
    expect(savedView(undefined)).toBe("both");
    expect(() => saveView("video", new RefusingStorage())).not.toThrow();
    expect(savedView(new RefusingStorage())).toBe("both");
  });
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

class RefusingStorage implements Pick<Storage, "getItem" | "setItem"> {
  getItem(): string | null {
    throw new DOMException("denied", "SecurityError");
  }
  setItem() {
    throw new DOMException("denied", "SecurityError");
  }
}
