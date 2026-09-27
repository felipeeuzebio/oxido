import { useEffect, useRef, useState } from "react";
import {
  createThemeController,
  DARK_QUERY,
  type ResolvedTheme,
  type ThemeController,
} from "./theme";

export interface Theme {
  /** The theme showing. "light" on the first render, then the real one. */
  resolved: ResolvedTheme;
  /** Switches to the other theme and remembers the choice. */
  toggle: () => void;
}

/**
 * The theme showing and a way to switch it. The first render can't know the
 * real theme (pre-rendered HTML can't read browser storage or the system
 * setting), so it says "light" until mounted. The colors are already right by
 * then, because the pre-paint script applied them, and anything that must match
 * on first paint (like the toggle's icon) should key off the `dark` class in
 * CSS instead of this value.
 */
export function useTheme(): Theme {
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const controller = useRef<ThemeController | null>(null);

  useEffect(() => {
    const storage = (() => {
      try {
        return window.localStorage;
      } catch {
        return undefined;
      }
    })();
    const instance = createThemeController({
      root: document.documentElement,
      storage,
      media: window.matchMedia(DARK_QUERY),
      onChange: (change) => setResolved(change.resolved),
    });
    controller.current = instance;
    return () => instance.destroy();
  }, []);

  return { resolved, toggle: () => controller.current?.toggle() };
}
