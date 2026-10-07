// What the rail lists: one item per page that exists. Kickoff, Build and
// Quizzes join it when their pages land (docs/design.md, "Components").
import { type LucideIcon, MapIcon, TvMinimalPlayIcon } from "lucide-react";

export interface RailItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Whether a page belongs to this item, which marks it as the current one. */
  owns: (pathname: string) => boolean;
}

export function railItems(firstLesson: string | null): RailItem[] {
  const roadmap: RailItem = {
    label: "Roadmap",
    to: "/",
    icon: MapIcon,
    owns: (path) => path === "/",
  };
  if (!firstLesson) return [roadmap];
  // Until progress tracking lands, the lesson item opens the first lesson.
  const lesson: RailItem = {
    label: "Lesson",
    to: firstLesson,
    icon: TvMinimalPlayIcon,
    owns: (path) => path.startsWith("/lesson/"),
  };
  return [roadmap, lesson];
}

export const currentItem = (items: RailItem[], pathname: string) =>
  items.find((item) => item.owns(pathname));
