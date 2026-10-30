import type { MouseEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Task } from "../content/types";
import { beltColor } from "../roadmap/belt-color";
import { CodeText } from "../roadmap/CodeText";
import { taskTitle } from "./task";

interface TaskBriefProps {
  task: Task;
  /** The brief, compiled from the class's Markdown; raw HTML in it was escaped. */
  html: string;
  /** Plays the video from a moment, in seconds. */
  onPlayFrom: (seconds: number) => void;
}

/**
 * What the class asks of the student once the video is done (decision D35):
 * its stripes or drill, then the brief. A hint in the brief (the compiler's
 * data-seek link, from `[text](video:N)`) plays the video from its moment.
 */
export function TaskBrief({ task, html, onPlayFrom }: TaskBriefProps) {
  const playFrom = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-seek]");
    if (!link) return;
    event.preventDefault();
    onPlayFrom(Number(link.dataset.seek));
  };

  return (
    <section aria-labelledby="task-title" className="min-w-0">
      <Card>
        <CardHeader className="gap-3">
          <p className="text-sm font-bold text-primary-muted-foreground">Your task</p>
          <h2 id="task-title" className="text-2xl font-bold">
            {taskTitle(task)}
          </h2>
          {task.kind === "stripes" && (
            <ol className="flex flex-col gap-2 text-sm">
              {task.stripes.map((stripe) => (
                <li key={stripe.number} className="flex items-baseline gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn("size-2.5 shrink-0 rounded-sm border", beltColor(task.belt))}
                  />
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    Stripe {stripe.number}
                  </span>
                  <span className="font-medium">
                    <CodeText text={stripe.title} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardHeader>
        <CardContent>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: only the links inside react, and Enter on a link fires click too */}
          <article
            aria-label="Brief"
            className="lesson flex min-w-0 flex-col gap-4"
            onClick={playFrom}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: the content compiler's output; it escapes raw HTML in lessons (crates/oxido-content)
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
