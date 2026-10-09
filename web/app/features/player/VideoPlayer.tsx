import { PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { createPlayer, formatTime, type PlayerStatus } from "./player";

/** Every video in the course is from his channel (decision D16). */
export const CHANNEL = "Let's Get Rusty";

interface VideoPlayerProps {
  /** The YouTube video ID. */
  video: string;
  title: string;
  /** Called when the student presses play. */
  onStart?: () => void;
}

/**
 * The lesson's video. Until the student presses play it's a facade, the
 * thumbnail and a play button, and nothing loads from YouTube but the image.
 * YouTube's embed rules forbid drawing over the player, so what we add sits in
 * a strip under it: for now, where the video is (decision D16).
 */
export function VideoPlayer({ video, title, onStart }: VideoPlayerProps) {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<PlayerStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    // A failed player is taken down too: the message replaces it.
    if (!started || failed || !element) return;
    let player: Awaited<ReturnType<typeof createPlayer>> | undefined;
    let gone = false;
    createPlayer(element, video, { onStatus: setStatus, onError: () => setFailed(true) }).then(
      (created) => {
        if (gone) created.destroy();
        else player = created;
      },
      () => setFailed(true),
    );
    return () => {
      gone = true;
      player?.destroy();
    };
  }, [started, failed, video]);

  const position = status && status.duration > 0 ? status : null;
  const where = position && `${formatTime(position.time)} of ${formatTime(position.duration)}`;
  const percent = position ? (position.time / position.duration) * 100 : 0;

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
      <div className="flex flex-col gap-1.5">
        {/* shadcn's Progress draws `value` but doesn't hand it to Radix's root,
            so the value screen readers get is set here. */}
        <Progress
          aria-label="Position in the video"
          value={percent}
          aria-valuenow={Math.round(percent)}
          aria-valuetext={where ?? "Not started"}
          className="h-1.5"
        />
        <figcaption className="flex flex-wrap justify-between gap-x-4 text-sm text-muted-foreground">
          {where && <span className="tabular-nums">{where}</span>}
          <span>
            {CHANNEL}: {title}
          </span>
        </figcaption>
      </div>
    </figure>
  );
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
