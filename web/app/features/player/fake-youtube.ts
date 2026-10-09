// A stand-in for YouTube's IFrame API in unit tests: it records what the app
// asks of it, and the test moves the video along by hand.
import { YT_STATE, type YTPlayer, type YTPlayerOptions } from "./youtube";

export class FakePlayer implements YTPlayer {
  state: number = YT_STATE.UNSTARTED;
  time = 0;
  duration = 928;
  destroyed = false;
  readonly frame: HTMLIFrameElement;

  constructor(
    readonly element: HTMLElement,
    readonly options: YTPlayerOptions,
  ) {
    // The real API swaps the element it's given for its own iframe.
    this.frame = document.createElement("iframe");
    this.frame.title = "YouTube video player";
    element.replaceWith(this.frame);
  }

  /** What the real API does once its iframe has loaded. */
  ready() {
    this.options.events?.onReady?.({ target: this });
  }

  /** Moves the video to a state, as YouTube does when it plays, pauses or shows an ad. */
  setState(state: number, time = this.time) {
    this.state = state;
    this.time = time;
    this.options.events?.onStateChange?.({ target: this, data: state });
  }

  fail(code: number) {
    this.options.events?.onError?.({ target: this, data: code });
  }

  /** Whether the app asked it to play. YouTube decides when it does (an ad may come first), so the test moves the state. */
  playRequested = false;

  playVideo() {
    this.playRequested = true;
  }
  pauseVideo() {
    this.setState(YT_STATE.PAUSED);
  }
  seekTo(seconds: number) {
    this.time = seconds;
  }
  getCurrentTime() {
    return this.time;
  }
  getDuration() {
    return this.duration;
  }
  getPlayerState() {
    return this.state;
  }
  destroy() {
    this.destroyed = true;
    this.frame.remove();
  }
}

/** Puts a fake `window.YT` in place; `players` lists what the app created. */
export function installFakeYouTube() {
  const players: FakePlayer[] = [];
  window.YT = {
    Player: class extends FakePlayer {
      constructor(element: HTMLElement, options: YTPlayerOptions) {
        super(element, options);
        players.push(this);
      }
    },
  };
  return { players };
}

/** What YouTube's script does once it has loaded: installs the API, then calls back. */
export function finishLoading() {
  const fake = installFakeYouTube();
  window.onYouTubeIframeAPIReady?.();
  return fake;
}
