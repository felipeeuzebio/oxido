// Our small wrapper around YouTube's player (decision D16): it reports the
// time, seeks, and counts what was really watched.
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "./youtube";

export interface PlayerStatus {
  time: number;
  duration: number;
  playing: boolean;
}

export interface Player {
  /** Jumps to a moment and asks YouTube to play from there. */
  seek(seconds: number): void;
  /**
   * Seconds of the video seen at least once while it played. Ads (when YouTube
   * reports the video as unstarted), skipped parts and replays add nothing.
   */
  watched(): number;
  destroy(): void;
}

interface Callbacks {
  onStatus: (status: PlayerStatus) => void;
  /** One of YouTube's error codes (see YTPlayerOptions). */
  onError: (code: number) => void;
}

// The API has no time-update event, so the time is read this often.
const TICK_MS = 500;

/**
 * Starts the video in `host`. The API swaps an element for its iframe, so it
 * gets a child of `host` made here: React never sees that element go. The API
 * makes the iframe itself, with a referrer policy that sends this page's origin;
 * without a referrer YouTube refuses the embed (docs/architecture.md).
 */
export async function createPlayer(
  host: HTMLElement,
  video: string,
  { onStatus, onError }: Callbacks,
): Promise<Player> {
  const YT = await loadYouTubeApi();
  const seen = new Set<number>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let player: YTPlayer | undefined;

  const report = () => {
    if (!player) return;
    const time = player.getCurrentTime();
    const playing = player.getPlayerState() === YT_STATE.PLAYING;
    if (playing) seen.add(Math.floor(time));
    onStatus({ time, duration: player.getDuration(), playing });
  };

  const element = document.createElement("div");
  host.append(element);
  const created = new YT.Player(element, {
    videoId: video,
    width: "100%",
    height: "100%",
    playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: window.location.origin },
    events: {
      onReady: ({ target }) => {
        player = target;
        target.playVideo();
        report();
        timer = setInterval(report, TICK_MS);
      },
      onStateChange: report,
      onError: ({ data }) => onError(data),
    },
  });

  return {
    seek(seconds) {
      if (!player) return;
      player.seekTo(seconds, true);
      player.playVideo();
      report();
    },
    watched: () => seen.size,
    destroy() {
      clearInterval(timer);
      player = undefined;
      created.destroy();
      host.replaceChildren();
    },
  };
}

/** "06:31", or "1:02:05" past an hour. */
export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${String(minutes).padStart(2, "0")}:${rest}`;
}
