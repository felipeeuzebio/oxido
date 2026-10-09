import { type MouseEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Lesson } from "../content/types";
import { type SeekRequest, VideoPlayer } from "../player/VideoPlayer";
import type { LessonPlace } from "./place";
import { browserStorage, savedView, saveView, VIEWS, type View } from "./views";

const NAMES: Record<View, string> = { video: "Video", both: "Both", text: "Text" };

const WIDTH: Record<View, string> = { video: "max-w-5xl", both: "max-w-7xl", text: "max-w-3xl" };

/**
 * A class: the video, the text lesson, or both side by side. Both and Video
 * share one layout that only changes its columns, so switching between them
 * keeps the video playing; YouTube's player would restart if its iframe moved.
 * Text takes the player down. Below lg the video sits above the text, and once
 * it has started it stays pinned to the top while the text scrolls under it
 * (decision D33).
 */
export function LessonView({ lesson, place }: { lesson: Lesson; place: LessonPlace }) {
  const [view, setView] = useState<View>("both");
  const [started, setStarted] = useState(false);
  const [seek, setSeek] = useState<SeekRequest>();

  // Pre-rendered pages can't read the browser's storage, so the saved view
  // applies once the page is running.
  useEffect(() => {
    setView(savedView(browserStorage()));
  }, []);

  const pick = (next: string) => {
    // Pressing the selected view again unselects it in a ToggleGroup; keep it.
    const picked = VIEWS.find((candidate) => candidate === next);
    if (!picked) return;
    if (picked === "text") setStarted(false);
    setView(picked);
    saveView(picked, browserStorage());
  };

  // A time in the text (`#t=2:47`, compiled to data-seek) plays the video from
  // there. From Text view it brings the video back, for this class only.
  const playFrom = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-seek]");
    if (!link) return;
    event.preventDefault();
    const seconds = Number(link.dataset.seek);
    if (view === "text") setView("both");
    setStarted(true);
    setSeek((last) => ({ seconds, id: (last?.id ?? 0) + 1 }));
  };

  return (
    <div
      className={cn("mx-auto flex w-full flex-col gap-8 px-4 py-8 md:px-10 md:py-12", WIDTH[view])}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb aria-label="Breadcrumb">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Roadmap</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem title={place.phaseTitle}>{place.phase}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{place.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold md:text-4xl">{lesson.title}</h1>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="View"
          value={view}
          onValueChange={pick}
        >
          {VIEWS.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-4">
              {NAMES[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>

      <div className={cn("grid gap-8", view === "both" && "lg:grid-cols-2 lg:items-start")}>
        {view !== "text" && (
          <div
            key="video"
            className={cn(
              "lg:sticky lg:top-6",
              started &&
                "max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:border-b max-lg:bg-background max-lg:py-2",
            )}
          >
            <VideoPlayer
              video={lesson.video}
              title={lesson.title}
              onStart={() => setStarted(true)}
              seek={seek}
            />
          </div>
        )}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: only the links inside react, and Enter on a link fires click too */}
        <article
          key="text"
          aria-label="Text lesson"
          hidden={view === "video"}
          className="lesson flex min-w-0 flex-col gap-4"
          onClick={playFrom}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the content compiler's output; it escapes raw HTML in lessons (crates/oxido-content)
          dangerouslySetInnerHTML={{ __html: lesson.html }}
        />
      </div>
    </div>
  );
}
