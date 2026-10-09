import { useEffect, useState } from "react";

/**
 * Ctrl+K, or ⌘K on a Mac. Shift and Alt stay free for other shortcuts, and K
 * alone is just a letter someone is typing.
 */
export const isPaletteShortcut = (event: KeyboardEvent) =>
  event.key.toLowerCase() === "k" &&
  (event.ctrlKey || event.metaKey) &&
  !event.shiftKey &&
  !event.altKey;

/** Whether the command palette is open; the shortcut toggles it from any page. */
export function usePalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      // Browsers put Ctrl+K on their own search box.
      event.preventDefault();
      setOpen((was) => !was);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return { open, setOpen };
}
