// The part of YouTube's IFrame API the player uses, typed here rather than
// through a types package (decision D16), and the loader for its script.

export const API_URL = "https://www.youtube.com/iframe_api";

/** The values `getPlayerState` returns. During an ad the video reads as unstarted. */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTEvent {
  target: YTPlayer;
}

export interface YTPlayerOptions {
  videoId: string;
  width?: string;
  height?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YTEvent) => void;
    onStateChange?: (event: YTEvent & { data: number }) => void;
    /** 2: bad ID, 5: can't play in HTML5, 100: gone or private, 101 and 150: not embeddable, 153: no referrer. */
    onError?: (event: YTEvent & { data: number }) => void;
  };
}

export interface YTNamespace {
  /** Swaps `element` for the player's iframe. */
  Player: new (
    element: HTMLElement,
    options: YTPlayerOptions,
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

/**
 * Loads YouTube's script the first time a player needs it; every later call
 * shares that load. A failed load can be tried again.
 */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise((resolve, reject) => {
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = API_URL;
    script.async = true;
    script.addEventListener("error", () => {
      script.remove();
      loading = null;
      reject(new Error("YouTube's player didn't load"));
    });
    document.head.append(script);
  });
  return loading;
}
