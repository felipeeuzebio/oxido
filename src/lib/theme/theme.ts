// Light / dark theme. Internally the default is "system": it follows the
// operating system and keeps following it when it changes. The UI is a single
// toggle that switches to the other theme; from then on the student's choice
// is saved and the system no longer matters. There's no way back to "system"
// from the UI, on purpose: two themes, one button.
//
// The logic is plain functions over small interfaces (storage, media query,
// root element) so it can be tested without a browser. Dark mode is the `dark`
// class on <html>, which is what shadcn/ui components and Tailwind's `dark:`
// variant expect. PRE_PAINT_SCRIPT applies the saved choice before the app
// loads, so the page never flashes the wrong colors.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const STORAGE_KEY = "oxido:theme";
export const DARK_CLASS = "dark";
export const DEFAULT_PREFERENCE: ThemePreference = "system";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

/** The saved choice, or "system" when nothing valid is saved or storage is blocked. */
export function readPreference(storage: ReadableStorage | undefined): ThemePreference {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    return isThemePreference(saved) ? saved : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/** Saves an explicit choice. "system" removes the key, so the default applies. */
export function writePreference(storage: WritableStorage | undefined, preference: ThemePreference) {
  try {
    if (preference === "system") storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked (private windows, locked-down browsers). The theme
    // still applies for this session.
  }
}

export function applyTheme(
  root: HTMLElement,
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  const resolved = resolveTheme(preference, systemPrefersDark);
  root.classList.toggle(DARK_CLASS, resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

interface MediaQuery {
  readonly matches: boolean;
  addEventListener(type: "change", listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: "change", listener: (event: { matches: boolean }) => void): void;
}

export interface ThemeChange {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

export interface ThemeControllerOptions {
  root: HTMLElement;
  storage: (ReadableStorage & WritableStorage) | undefined;
  media: MediaQuery;
  onChange?: (change: ThemeChange) => void;
}

export interface ThemeController {
  readonly preference: ThemePreference;
  /** The theme showing right now. */
  readonly resolved: ResolvedTheme;
  set(preference: ThemePreference): void;
  /** Switches to the other theme and saves it as the student's choice. */
  toggle(): void;
  destroy(): void;
}

export function createThemeController(options: ThemeControllerOptions): ThemeController {
  const { root, storage, media, onChange } = options;
  let preference = readPreference(storage);
  let resolved: ResolvedTheme = "light";

  const apply = () => {
    resolved = applyTheme(root, preference, media.matches);
    onChange?.({ preference, resolved });
  };

  const onSystemChange = () => {
    if (preference === "system") apply();
  };

  const set = (next: ThemePreference) => {
    preference = next;
    writePreference(storage, next);
    apply();
  };

  media.addEventListener("change", onSystemChange);
  apply();

  return {
    get preference() {
      return preference;
    },
    get resolved() {
      return resolved;
    },
    set,
    toggle() {
      set(resolved === "dark" ? "light" : "dark");
    },
    destroy() {
      media.removeEventListener("change", onSystemChange);
    },
  };
}

/**
 * Inline script for <head>: the first-paint half of the controller above.
 * It uses the same key, class and rules; theme.test.ts runs it to check.
 */
export const PRE_PAINT_SCRIPT = `(() => {
  let saved = null;
  try {
    saved = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  } catch {}
  const dark = saved === "dark" || (saved !== "light" && matchMedia(${JSON.stringify(DARK_QUERY)}).matches);
  document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)}, dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();`;
