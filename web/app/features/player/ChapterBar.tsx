import { type PointerEvent, useRef, useState } from "react";
import { type ChapterMark, filled, segmentAt, segments } from "./chapter-bar";
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

/**
 * The strip under the video, split into a segment per chapter, as YouTube
 * splits its progress bar. The bar thickens under the pointer, and the segment
 * under it thickens more; a tip names the chapter and the moment there, and a
 * handle sits at the playhead. Pressing and dragging scrubs: the fill and the
 * tip follow the pointer across chapters, and the video plays from where it's
 * let go, so a click is a drag that doesn't move. Each segment is a button, so
 * the keyboard reaches every chapter, and Enter plays it from its start.
 */
export function ChapterBar({ title, chapters, length, time, onSeek }: ChapterBarProps) {
  const strip = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [hover, setHover] = useState<{ time: number; x: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState<{ index: number; x: number } | null>(null);
  const parts = segments(chapters, length, title);

  const stripLeft = () => strip.current?.getBoundingClientRect().left ?? 0;

  // The moment under the pointer: in the segment it's over, or the nearest one
  // when it's in a gap or past either end.
  const momentAt = (clientX: number) => {
    let index = 0;
    let nearest = Number.POSITIVE_INFINITY;
    buttons.current.forEach((button, at) => {
      if (!button) return;
      const box = button.getBoundingClientRect();
      const distance = clientX < box.left ? box.left - clientX : Math.max(clientX - box.right, 0);
      if (distance < nearest) {
        nearest = distance;
        index = at;
      }
    });
    const part = parts[index];
    const box = buttons.current[index]?.getBoundingClientRect();
    const across = box && box.width > 0 ? (clientX - box.left) / box.width : 0;
    return part.from + Math.min(Math.max(across, 0), 1) * (part.to - part.from);
  };

  const point = (event: PointerEvent) =>
    setHover({ time: momentAt(event.clientX), x: event.clientX - stripLeft() });

  const stop = (event: PointerEvent) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // While dragging, the bar shows where the video will go, not where it is.
  const shown = dragging && hover ? hover.time : time;
  const pointed = hover && segmentAt(parts, hover.time);
  // The tip follows the pointer; for a segment with keyboard focus, it sits
  // over the segment's middle and gives the chapter's start.
  const tip = pointed
    ? { title: pointed.title, time: hover.time, x: hover.x }
    : focused && {
        title: parts[focused.index].title,
        time: parts[focused.index].start,
        x: focused.x,
      };
  const width = strip.current?.clientWidth ?? 0;
  const shift = !tip ? 0 : tip.x < 80 ? 0 : tip.x > width - 80 ? -100 : -50;
  const playhead = segmentAt(parts, shown);
  const percent = length > 0 ? (time / length) * 100 : 0;

  return (
    <div ref={strip} data-dragging={dragging || undefined} className="group/bar relative">
      <span
        role="progressbar"
        aria-label="Position in the video"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(length)}`}
        className="sr-only"
      />
      <ol
        aria-label="Chapters"
        // Horizontal drags scrub; a vertical swipe still scrolls the page and
        // cancels the drag.
        className="flex h-6 touch-pan-y items-center gap-0.5"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // Keep focus where it was: a pointer press isn't a keyboard visit.
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
          point(event);
        }}
        onPointerMove={point}
        onPointerUp={(event) => {
          if (dragging) onSeek(momentAt(event.clientX));
          stop(event);
        }}
        onPointerCancel={stop}
        onPointerLeave={() => {
          if (!dragging) setHover(null);
        }}
      >
        {parts.map((part, index) => (
          <li
            key={`${part.from}:${part.title}`}
            style={{ flexGrow: part.to - part.from }}
            className="h-full min-w-1 basis-0"
          >
            <button
              ref={(button) => {
                buttons.current[index] = button;
              }}
              type="button"
              aria-label={`Chapter: ${part.title}, ${formatTime(part.start)}`}
              onFocus={(event) =>
                setFocused({
                  index,
                  x:
                    event.currentTarget.getBoundingClientRect().left -
                    stripLeft() +
                    event.currentTarget.offsetWidth / 2,
                })
              }
              onBlur={() => setFocused(null)}
              // Pointers play on release (onPointerUp above). A click from the
              // keyboard has no pointer: it plays the chapter from its start.
              onClick={(event) => {
                if (event.detail === 0) onSeek(part.start);
              }}
              className="group/segment relative flex size-full cursor-pointer items-center rounded-xs"
            >
              <span className="relative h-2 w-full scale-y-50 overflow-hidden rounded-full bg-foreground/15 transition-transform duration-150 group-hover/bar:scale-y-75 group-hover/segment:scale-y-100 group-focus-visible/segment:scale-y-100 group-data-dragging/bar:scale-y-75">
                {hover && !dragging && (
                  <span
                    className="absolute inset-y-0 left-0 bg-foreground/25"
                    style={{ width: `${filled(part, hover.time) * 100}%` }}
                  />
                )}
                <span
                  data-slot="played"
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${filled(part, shown) * 100}%` }}
                />
              </span>
              {hover && part === playhead && (
                <span
                  data-slot="handle"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm"
                  style={{ left: `${filled(part, shown) * 100}%` }}
                />
              )}
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
