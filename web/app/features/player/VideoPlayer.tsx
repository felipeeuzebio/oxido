import { PlayIcon } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createPlayer, formatTime, type Player, type PlayerStatus } from "./player";

/** Every video in the course is from his channel (decision D16). */
export const CHANNEL = "Let's Get Rusty";

/** A request to play from a moment. Each click makes a new one, so the same time twice plays from it twice. */
export interface SeekRequest {
  seconds: number;
}

/** A chapter on the strip: a part of the lesson and when it starts, in seconds. */
export interface ChapterMark {
  title: string;
  id: string | null;
  start: number;
}

interface VideoPlayerProps {
  /** The YouTube video ID. */
  video: string;
  title: string;
  /** The video's length in seconds, known before YouTube's player loads. */
  duration?: number;
  chapters?: ChapterMark[];
  /** Called when the student presses play. */
  onStart?: () => void;
  /** The latest moment to play from: it starts the video there, or moves it. */
  seek?: SeekRequest;
}

/**
 * The lesson's video. Until the student presses play it's a facade, the
 * thumbnail and a play button, and nothing loads from YouTube but the image.
 * YouTube's embed rules forbid drawing over the player, so what we add sits in
 * a strip under it: where the video is, and a marker per chapter that plays
 * from there (decisions D16 and D34).
 */
export function VideoPlayer({
  video,
  title,
  duration = 0,
  chapters = [],
  onStart,
  seek,
}: VideoPlayerProps) {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<PlayerStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  // A seek asked for before there's a player, made as soon as there is one.
  const pending = useRef<number | undefined>(undefined);

  useEffect(() => {
    const element = host.current;
    // A failed player is taken down too: the message replaces it.
    if (!started || failed || !element) return;
    let created: Player | undefined;
    let gone = false;
    createPlayer(element, video, {
      onStatus: setStatus,
      onError: () => setFailed(true),
    }).then(
      (made) => {
        if (gone) {
          made.destroy();
        } else {
          created = made;
          player.current = made;
          if (pending.current !== undefined) made.seek(pending.current);
          pending.current = undefined;
        }
      },
      () => setFailed(true),
    );
    return () => {
      gone = true;
      created?.destroy();
      player.current = null;
    };
  }, [started, failed, video]);

  useEffect(() => {
    if (seek) playAt(seek.seconds, player, pending, () => setStarted(true));
  }, [seek]);

  // YouTube's own length once it plays; the outline's until then.
  const length = status && status.duration > 0 ? status.duration : duration;
  const time = status?.time ?? 0;
  const where = length > 0 ? `${formatTime(time)} of ${formatTime(length)}` : null;
  const percent = length > 0 ? (time / length) * 100 : 0;

  return (
    <figure className="flex flex-col gap-2">
      {/* YouTube wants its player at least 200px each way; on the narrowest
          phones that's taller than 16:9, and YouTube letterboxes the video. */}
      <div className="relative aspect-video min-h-50 overflow-hidden rounded-lg bg-muted">
        {failed ? (
          <Unavailable video={video} />
        ) : started ? (
          <div ref={host} className="size-full" />
        ) : (
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              onStart?.();
            }}
            aria-label={`Play video: ${title}, from ${CHANNEL}`}
            className="group size-full cursor-pointer"
          >
            <img
              src={`https://i.ytimg.com/vi/${video}/hqdefault.jpg`}
              alt=""
              className="size-full object-cover"
            />
            <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105 group-focus-visible:scale-105">
              <PlayIcon aria-hidden="true" className="ml-1 size-7 fill-current" />
            </span>
          </button>
        )}
      </div>
      <div className="relative">
        {/* shadcn's Progress draws `value` but doesn't hand it to Radix's root,
            so the value screen readers get is set here. */}
        <Progress
          aria-label="Position in the video"
          value={percent}
          aria-valuenow={Math.round(percent)}
          aria-valuetext={where ?? "Not started"}
          className="h-1.5"
        />
        {length > 0 && (
          <TooltipProvider delayDuration={150}>
            {chapters.map((chapter) => (
              <Tooltip key={chapter.id ?? "opening"}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Chapter: ${chapter.title}, ${formatTime(chapter.start)}`}
                    onClick={() =>
                      playAt(chapter.start, player, pending, () => {
                        setStarted(true);
                        onStart?.();
                      })
                    }
                    style={{ left: `${(chapter.start / length) * 100}%` }}
                    className="group absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-0.5 rounded-full bg-foreground/50 transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {chapter.title} · {formatTime(chapter.start)}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        )}
      </div>
      <figcaption className="flex flex-wrap justify-between gap-x-4 text-sm text-muted-foreground">
        {where && <span className="tabular-nums">{where}</span>}
        <span>
          {CHANNEL}: {title}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Plays from a moment: the player seeks if it's there; otherwise the moment
 * waits for the player, which `start` starts if it hasn't started.
 */
function playAt(
  seconds: number,
  player: RefObject<Player | null>,
  pending: RefObject<number | undefined>,
  start: () => void,
) {
  if (player.current) {
    player.current.seek(seconds);
  } else {
    pending.current = seconds;
    start();
  }
}

function Unavailable({ video }: { video: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-medium">The video couldn't load here.</p>
      <a
        href={`https://www.youtube.com/watch?v=${video}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm"
      >
        Watch it on YouTube
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
