/**
 * The first stop for Tab on every page: it jumps past the rail to the page's
 * content (`<main id="main">` in root.tsx). Hidden until it has focus; the
 * padding goes on with focus because `not-sr-only` resets it.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-background font-medium text-foreground shadow-md ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-20 focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
  );
}
