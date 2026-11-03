// A stand-in for the browser's localStorage, for tests of the website's storage.
import type { Shelf } from "./browser";

export function memoryShelf(): Shelf & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}
