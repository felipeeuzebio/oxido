import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  createThemeController,
  DARK_CLASS,
  PRE_PAINT_SCRIPT,
  readPreference,
  resolveTheme,
  STORAGE_KEY,
  writePreference,
} from "./theme";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

function fakeMediaQuery(matches: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  return {
    matches,
    addEventListener: (_: "change", fn: (event: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: "change", fn: (event: { matches: boolean }) => void) =>
      listeners.delete(fn),
    flip(next: boolean) {
      this.matches = next;
      for (const fn of listeners) fn({ matches: next });
    },
    listenerCount: () => listeners.size,
  };
}

const isDark = (root: HTMLElement) => root.classList.contains(DARK_CLASS);

describe("theme settings", () => {
  it("stores the choice under the project's own key", () => {
    expect(STORAGE_KEY).toBe("oxido:theme");
  });

  it("marks dark mode with the class shadcn/ui components expect", () => {
    expect(DARK_CLASS).toBe("dark");
  });
});

describe("resolveTheme", () => {
  it("follows the system when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the system when the student picked a theme", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("readPreference", () => {
  it("defaults to system when nothing is saved", () => {
    expect(readPreference(memoryStorage())).toBe("system");
  });

  it("returns a saved choice", () => {
    expect(readPreference(memoryStorage({ [STORAGE_KEY]: "dark" }))).toBe("dark");
  });

  it("falls back to system on unknown values or when storage throws", () => {
    expect(readPreference(memoryStorage({ [STORAGE_KEY]: "sepia" }))).toBe("system");
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readPreference(broken)).toBe("system");
    expect(readPreference(undefined)).toBe("system");
  });
});

describe("writePreference", () => {
  it("saves light and dark, and forgets the key for system", () => {
    const storage = memoryStorage();
    writePreference(storage, "light");
    expect(storage.data.get(STORAGE_KEY)).toBe("light");
    writePreference(storage, "system");
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it("doesn't throw when storage is unavailable", () => {
    const broken = {
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => writePreference(broken, "dark")).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("toggles the dark class and the browser's color scheme", () => {
    const root = document.createElement("html");
    expect(applyTheme(root, "system", true)).toBe("dark");
    expect(isDark(root)).toBe(true);
    expect(root.style.colorScheme).toBe("dark");

    expect(applyTheme(root, "light", true)).toBe("light");
    expect(isDark(root)).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });
});

describe("createThemeController", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement("html");
  });

  it("starts from the saved preference, defaulting to system", () => {
    const controller = createThemeController({
      root,
      storage: memoryStorage(),
      media: fakeMediaQuery(true),
    });
    expect(controller.preference).toBe("system");
    expect(isDark(root)).toBe(true);
  });

  it("re-applies when the system theme changes and the preference is system", () => {
    const media = fakeMediaQuery(false);
    createThemeController({ root, storage: memoryStorage(), media });
    media.flip(true);
    expect(isDark(root)).toBe(true);
  });

  it("stops following the system after the student picks a theme", () => {
    const media = fakeMediaQuery(false);
    const storage = memoryStorage();
    const controller = createThemeController({ root, storage, media });
    controller.set("light");
    media.flip(true);
    expect(isDark(root)).toBe(false);
    expect(storage.data.get(STORAGE_KEY)).toBe("light");
  });

  it("reports every change", () => {
    const onChange = vi.fn();
    const controller = createThemeController({
      root,
      storage: memoryStorage(),
      media: fakeMediaQuery(false),
      onChange,
    });
    controller.set("dark");
    expect(onChange).toHaveBeenLastCalledWith({ preference: "dark", resolved: "dark" });
  });

  it("exposes the theme that's showing, following the system until toggled", () => {
    const media = fakeMediaQuery(true);
    const controller = createThemeController({ root, storage: memoryStorage(), media });
    expect(controller.resolved).toBe("dark");
    media.flip(false);
    expect(controller.resolved).toBe("light");
  });

  it("toggle switches to the opposite of what's showing and remembers it", () => {
    const media = fakeMediaQuery(true);
    const storage = memoryStorage();
    const controller = createThemeController({ root, storage, media });

    controller.toggle();
    expect(controller.resolved).toBe("light");
    expect(isDark(root)).toBe(false);
    expect(storage.data.get(STORAGE_KEY)).toBe("light");

    media.flip(false);
    media.flip(true);
    expect(isDark(root)).toBe(false);
  });

  it("toggle from a light system gives dark, and a second toggle gives light again", () => {
    const storage = memoryStorage();
    const controller = createThemeController({ root, storage, media: fakeMediaQuery(false) });
    controller.toggle();
    expect(isDark(root)).toBe(true);
    expect(storage.data.get(STORAGE_KEY)).toBe("dark");
    controller.toggle();
    expect(isDark(root)).toBe(false);
    expect(storage.data.get(STORAGE_KEY)).toBe("light");
  });

  it("reports the theme that's showing after a toggle", () => {
    const onChange = vi.fn();
    const controller = createThemeController({
      root,
      storage: memoryStorage(),
      media: fakeMediaQuery(true),
      onChange,
    });
    controller.toggle();
    expect(onChange).toHaveBeenLastCalledWith({ preference: "light", resolved: "light" });
  });

  it("removes its listener when destroyed", () => {
    const media = fakeMediaQuery(false);
    const controller = createThemeController({ root, storage: memoryStorage(), media });
    controller.destroy();
    expect(media.listenerCount()).toBe(0);
  });
});

describe("PRE_PAINT_SCRIPT (runs in <head> before the app loads)", () => {
  // Runs the script the way the browser would, against a fake document.
  function runScript(saved: string | null, systemDark: boolean) {
    const root = document.createElement("html");
    const run = new Function("document", "localStorage", "matchMedia", PRE_PAINT_SCRIPT);
    run(
      { documentElement: root },
      { getItem: (key: string) => (key === STORAGE_KEY ? saved : null) },
      () => ({ matches: systemDark }),
    );
    return root;
  }

  it("follows the system when nothing is saved", () => {
    expect(isDark(runScript(null, true))).toBe(true);
    expect(isDark(runScript(null, false))).toBe(false);
  });

  it("applies a saved choice regardless of the system", () => {
    expect(isDark(runScript("light", true))).toBe(false);
    expect(isDark(runScript("dark", false))).toBe(true);
  });

  it("sets the color scheme too", () => {
    expect(runScript("dark", false).style.colorScheme).toBe("dark");
  });
});
