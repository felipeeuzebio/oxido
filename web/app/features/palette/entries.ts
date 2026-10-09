// What the command palette lists: the pages, every written lesson under its
// phase, and the theme switch. Quizzes and build steps join with their pages.
import { type LucideIcon, MapIcon, MoonIcon, SunIcon, TvMinimalPlayIcon } from "lucide-react";
import { phaseNumber } from "../content/phase";
import type { PhaseLessons } from "../content/types";

export type PaletteEntry = {
  label: string;
  icon: LucideIcon;
  /** Other words that find it. */
  keywords: string[];
} & ({ to: string } | { action: "toggle-theme" });

export interface PaletteGroup {
  heading: string;
  entries: PaletteEntry[];
}

export function paletteGroups(lessons: PhaseLessons[], theme: "light" | "dark"): PaletteGroup[] {
  const other = theme === "dark" ? "light" : "dark";
  return [
    {
      heading: "Pages",
      entries: [
        { label: "Roadmap", icon: MapIcon, keywords: ["home", "belts", "phases"], to: "/" },
      ],
    },
    ...lessons.map((phase) => {
      const number = phaseNumber(phase.id);
      const name = number ? `Phase ${number}` : null;
      return {
        heading: name ? `${name}: ${phase.title}` : phase.title,
        entries: phase.lessons.map((lesson) => ({
          label: lesson.title,
          icon: TvMinimalPlayIcon,
          keywords: name ? [name, phase.title] : [phase.title],
          to: lesson.route,
        })),
      };
    }),
    {
      heading: "Theme",
      entries: [
        {
          label: `Switch to ${other} theme`,
          icon: other === "dark" ? MoonIcon : SunIcon,
          keywords: ["theme", "dark", "light", "mode"],
          action: "toggle-theme",
        },
      ],
    },
  ];
}
