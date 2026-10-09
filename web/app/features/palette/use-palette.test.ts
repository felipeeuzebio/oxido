import { describe, expect, it } from "vitest";
import { isPaletteShortcut } from "./use-palette";

const key = (init: Partial<KeyboardEventInit> & { key: string }) =>
  new KeyboardEvent("keydown", init);

describe("isPaletteShortcut", () => {
  it.each([
    ["Ctrl+K", key({ key: "k", ctrlKey: true })],
    ["⌘K", key({ key: "k", metaKey: true })],
    ["Ctrl+K with caps lock on", key({ key: "K", ctrlKey: true })],
  ])("opens on %s", (_, event) => {
    expect(isPaletteShortcut(event)).toBe(true);
  });

  it.each([
    ["K alone, typed in a note", key({ key: "k" })],
    ["Ctrl+Shift+K", key({ key: "K", ctrlKey: true, shiftKey: true })],
    ["Ctrl+Alt+K", key({ key: "k", ctrlKey: true, altKey: true })],
    ["Ctrl+J", key({ key: "j", ctrlKey: true })],
  ])("leaves %s alone", (_, event) => {
    expect(isPaletteShortcut(event)).toBe(false);
  });
});
