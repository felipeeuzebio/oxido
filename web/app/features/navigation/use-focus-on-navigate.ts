import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

/**
 * After an in-app navigation, moves focus to where the reader is going: the
 * element the link's hash names, else the new page's heading, else the main
 * content. A full page load moves focus itself, so the first page is left
 * alone. Screen readers then read the new heading, and Tab carries on from
 * there instead of from the link that was followed.
 */
export function useFocusOnNavigate() {
  const { pathname, hash } = useLocation();
  // Where focus last went, so a second run of the same effect (StrictMode)
  // does nothing.
  const last = useRef(`${pathname}${hash}`);

  useEffect(() => {
    const shown = `${pathname}${hash}`;
    if (last.current === shown) return;
    last.current = shown;
    const target =
      (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) ||
      document.querySelector<HTMLElement>("main h1") ||
      document.getElementById("main");
    if (!target) return;
    // Headings can't take focus until they're given a tabindex. What's made
    // focusable here isn't a control, so app.css hides its focus ring.
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.setAttribute("data-focus-target", "");
    }
    target.focus({ preventScroll: true });
  }, [pathname, hash]);
}
