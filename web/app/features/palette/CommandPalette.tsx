import { lazy, Suspense, useState } from "react";
import type { PaletteProps } from "./Palette";

const load = () => import("./Palette");
const Palette = lazy(load);

/** Starts loading the palette's code early, when the Search button is pointed at or focused. */
export const preloadPalette = () => void load();

/**
 * The command palette (decision D32). Its code, cmdk included, loads the first
 * time it opens, and it stays mounted after that so it can animate closed.
 */
export function CommandPalette(props: PaletteProps) {
  const [wanted, setWanted] = useState(props.open);
  if (props.open && !wanted) setWanted(true);
  return wanted ? (
    <Suspense fallback={null}>
      <Palette {...props} />
    </Suspense>
  ) : null;
}
