// Each belt's color class, written out so Tailwind finds them (design.md, "Belts").
const COLORS: Record<string, string> = {
  white: "bg-belt-white",
  yellow: "bg-belt-yellow",
  orange: "bg-belt-orange",
  green: "bg-belt-green",
  blue: "bg-belt-blue",
  purple: "bg-belt-purple",
  brown: "bg-belt-brown",
  black: "bg-belt-black",
};

/** The background class for a belt; a belt without a color of its own is muted. */
export const beltColor = (belt: string) =>
  Object.hasOwn(COLORS, belt) ? COLORS[belt] : "bg-muted";
