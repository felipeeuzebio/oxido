import { useState } from "react";
import { Link } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { Lesson } from "../content/types";
import { type SeekRequest, VideoPlayer } from "../player/VideoPlayer";
import type { LessonPlace } from "./place";
import { TaskBrief } from "./TaskBrief";

/**
 * A class: the video, then its task (decision D35), side by side on wide
 * screens. Below lg the video sits above the task, and once it has started it
 * stays pinned to the top while the brief scrolls under it (decision D33).
 */
export function LessonView({ lesson, place }: { lesson: Lesson; place: LessonPlace }) {
  const [started, setStarted] = useState(false);
  const [seek, setSeek] = useState<SeekRequest>();

  // A hint in the brief plays the video from its moment, starting it if needed.
  const playFrom = (seconds: number) => {
    setStarted(true);
    setSeek({ seconds });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <header className="flex flex-col gap-2">
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
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div
          className={cn(
            "lg:sticky lg:top-6",
            started &&
              "max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:border-b max-lg:bg-background max-lg:py-2",
          )}
        >
          <VideoPlayer
            video={lesson.video}
            title={lesson.title}
            duration={lesson.duration}
            chapters={lesson.chapters}
            onStart={() => setStarted(true)}
            seek={seek}
          />
        </div>
        <TaskBrief task={lesson.task} html={lesson.html} onPlayFrom={playFrom} />
      </div>
    </div>
  );
}
