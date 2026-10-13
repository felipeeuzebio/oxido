import { type MouseEvent, useRef, useState } from "react";
import { type ChapterMark, filled, type Segment, segmentAt, segments } from "./chapter-bar";
import { formatTime } from "./player";

interface ChapterBarProps {
  /** The lesson's title: the one segment's name when there are no chapters. */
  title: string;
  chapters: ChapterMark[];
  /** The video's length in seconds. */
  length: number;
  /** Where the video is, in seconds. */
  time: number;
  /** Play from a moment, in seconds. */
  onSeek: (seconds: number) => void;
}

/** Where the pointer is across a segment, as a moment in the video. */
function momentAt(event: MouseEvent<HTMLElement>, segment: Segment) {
  const box = event.currentTarget.getBoundingClientRect();
  const across = box.width > 0 ? (event.clientX - box.left) / box.width : 0;
  return segment.from + Math.min(Math.max(across, 0), 1) * (segment.to - segment.from);
}

/**
 * The strip under the video, split into a segment per chapter, as YouTube
 * splits its progress bar. The bar thickens under the pointer, and the segment
 * under it thickens more; a tip names the chapter and the moment there.
 * Clicking plays from that moment. Each segment is a button, so the keyboard
 * reaches every chapter, and Enter plays it from its start.
 */
export function ChapterBar({ title, chapters, length, time, onSeek }: ChapterBarProps) {
  const strip = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ time: number; x: number } | null>(null);
  const [focused, setFocused] = useState<{ index: number; x: number } | null>(null);
  const parts = segments(chapters, length, title);

  // The tip follows the pointer; for a segment with keyboard focus, it sits
  // over the segment's middle and gives the chapter's start.
  const pointed = hover && segmentAt(parts, hover.time);
  const tip = pointed
    ? { title: pointed.title, time: hover.time, x: hover.x }
    : focused && {
        title: parts[focused.index].title,
        time: parts[focused.index].start,
        x: focused.x,
      };
  const width = strip.current?.clientWidth ?? 0;
  const shift = !tip ? 0 : tip.x < 80 ? 0 : tip.x > width - 80 ? -100 : -50;

  const left = (element: HTMLElement) =>
    element.getBoundingClientRect().left - (strip.current?.getBoundingClientRect().left ?? 0);
  const percent = length > 0 ? (time / length) * 100 : 0;

  return (
    <div ref={strip} className="group/bar relative">
      <span
        role="progressbar"
        aria-label="Position in the video"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(length)}`}
        className="sr-only"
      />
      <ol aria-label="Chapters" className="flex h-6 items-center gap-0.5">
        {parts.map((part, index) => (
          <li
            key={`${part.from}:${part.title}`}
            style={{ flexGrow: part.to - part.from }}
            className="h-full min-w-1 basis-0"
          >
            <button
              type="button"
              aria-label={`Chapter: ${part.title}, ${formatTime(part.start)}`}
              onPointerMove={(event) =>
                setHover({
                  time: momentAt(event, part),
                  x: event.clientX - (strip.current?.getBoundingClientRect().left ?? 0),
                })
              }
              onPointerLeave={() => setHover(null)}
              onFocus={(event) =>
                setFocused({
                  index,
                  x: left(event.currentTarget) + event.currentTarget.offsetWidth / 2,
                })
              }
              onBlur={() => setFocused(null)}
              // A click from the keyboard has no pointer: play the chapter from its start.
              onClick={(event) => onSeek(event.detail === 0 ? part.start : momentAt(event, part))}
              className="group/segment flex size-full cursor-pointer items-center rounded-xs"
            >
              <span className="relative h-2 w-full scale-y-50 overflow-hidden rounded-full bg-foreground/15 transition-transform duration-150 group-hover/bar:scale-y-75 group-hover/segment:scale-y-100 group-focus-visible/segment:scale-y-100">
                {hover && (
                  <span
                    className="absolute inset-y-0 left-0 bg-foreground/25"
                    style={{ width: `${filled(part, hover.time) * 100}%` }}
                  />
                )}
                <span
                  data-slot="played"
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${filled(part, time) * 100}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ol>
      {tip && (
        <div
          data-slot="chapter-tip"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full z-10 mb-1 flex flex-col items-center rounded-md bg-foreground px-2.5 py-1 text-xs whitespace-nowrap text-background shadow-md"
          style={{ left: tip.x, transform: `translateX(${shift}%)` }}
        >
          <span className="font-medium">{tip.title}</span>
          <span className="tabular-nums opacity-80">{formatTime(tip.time)}</span>
        </div>
      )}
    </div>
  );
}
