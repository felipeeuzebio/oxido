// The lesson page's three views. The choice is a convenience for this browser
// only, so it lives in localStorage, like the theme.

export const VIEWS = ["video", "both", "text"] as const;
export type View = (typeof VIEWS)[number];

const KEY = "oxido:view";

type Store = Pick<Storage, "getItem" | "setItem">;

export const isView = (value: unknown): value is View => VIEWS.includes(value as View);

/** The view picked last, or Both. Storage can be missing or refuse access. */
export function savedView(storage: Store | undefined): View {
  try {
    const value = storage?.getItem(KEY);
    return isView(value) ? value : "both";
  } catch {
    return "both";
  }
}

export function saveView(view: View, storage: Store | undefined) {
  try {
    storage?.setItem(KEY, view);
  } catch {
    // Not remembered, which is all that's lost.
  }
}

/** The browser's localStorage, if it lets us have it. */
export function browserStorage(): Store | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
