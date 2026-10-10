import type { Page } from "@playwright/test";

// End-to-end tests never reach YouTube: its API script and thumbnails are
// answered here. The fake player plays in real time from when it's asked to,
// and keeps itself on `window.fakePlayer` for tests to inspect.
const API = `
window.YT = {
  Player: class {
    constructor(element, options) {
      this.options = options;
      this.state = -1;
      this.at = 0;
      this.since = 0;
      this.frame = document.createElement("iframe");
      this.frame.title = "YouTube video player";
      this.frame.dataset.video = options.videoId;
      // Like the real API, size the iframe from the options ("100%").
      this.frame.width = options.width;
      this.frame.height = options.height;
      element.replaceWith(this.frame);
      window.fakePlayer = this;
      setTimeout(() => options.events.onReady({ target: this }), 50);
    }
    playVideo() {
      this.since = performance.now();
      this.state = 1;
      this.options.events.onStateChange({ target: this, data: 1 });
    }
    pauseVideo() {
      this.at = this.getCurrentTime();
      this.state = 2;
      this.options.events.onStateChange({ target: this, data: 2 });
    }
    seekTo(seconds) {
      this.at = seconds;
      this.since = performance.now();
    }
    getCurrentTime() {
      return this.state === 1 ? this.at + (performance.now() - this.since) / 1000 : this.at;
    }
    getDuration() { return 928; }
    getPlayerState() { return this.state; }
    destroy() { this.frame.remove(); }
  },
};
window.onYouTubeIframeAPIReady?.();
`;

// A 1×1 PNG, standing in for the thumbnail.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** Answers YouTube's requests with fakes, and returns the list of what the page asked YouTube for. */
export async function fakeYouTube(page: Page, { apiFails = false } = {}) {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (/youtube\.com|ytimg\.com/.test(request.url())) asked.push(request.url());
  });
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({ contentType: "image/png", body: PIXEL }),
  );
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    apiFails ? route.abort() : route.fulfill({ contentType: "text/javascript", body: API }),
  );
  return asked;
}
