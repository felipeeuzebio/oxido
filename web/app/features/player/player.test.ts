import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishLoading } from "./fake-youtube";
import { YT_STATE } from "./youtube";

// Each test loads the modules fresh, so the API starts out not loaded.
async function modules() {
  vi.resetModules();
  const youtube = await import("./youtube");
  const player = await import("./player");
  return { ...youtube, ...player };
}

const apiScripts = () =>
  document.head.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]');

beforeEach(() => {
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
  for (const script of apiScripts()) script.remove();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loadYouTubeApi", () => {
  it("adds YouTube's script once, however many players ask, and resolves when it's ready", async () => {
    const { loadYouTubeApi } = await modules();
    const first = loadYouTubeApi();
    const second = loadYouTubeApi();
    expect(apiScripts()).toHaveLength(1);

    finishLoading();
    expect(await first).toBe(window.YT);
    expect(await second).toBe(window.YT);
  });

  it("fails, and lets a later call try again, when the script can't load", async () => {
    const { loadYouTubeApi } = await modules();
    const attempt = loadYouTubeApi();
    apiScripts()[0].dispatchEvent(new Event("error"));
    await expect(attempt).rejects.toThrow("YouTube's player didn't load");

    loadYouTubeApi();
    expect(apiScripts()).toHaveLength(1);
  });
});

describe("createPlayer", () => {
  async function playing() {
    vi.useFakeTimers();
    const { createPlayer } = await modules();
    const host = document.createElement("div");
    document.body.append(host);
    const onStatus = vi.fn();
    const onError = vi.fn();
    const created = createPlayer(host, "OX9HJsJUDxA", { onStatus, onError });
    const { players } = finishLoading();
    const player = await created;
    const fake = players[0];
    fake.ready();
    return { host, player, fake, onStatus, onError };
  }

  it("lets the API make the iframe, so YouTube's referrer policy applies (no iframe of ours)", async () => {
    const { host, fake } = await playing();
    expect(fake.element.tagName).toBe("DIV");
    expect(host.querySelector("iframe")).toBe(fake.frame);
    expect(fake.frame.getAttribute("referrerpolicy")).not.toBe("no-referrer");
  });

  it("asks for the video, inline and playing, from this page's origin", async () => {
    const { fake } = await playing();
    expect(fake.options.videoId).toBe("OX9HJsJUDxA");
    expect(fake.options.playerVars).toMatchObject({
      autoplay: 1,
      playsinline: 1,
      origin: window.location.origin,
    });
    expect(fake.playRequested).toBe(true);
  });

  it("reports the time and the length as the video plays", async () => {
    const { fake, onStatus } = await playing();
    fake.setState(YT_STATE.PLAYING);
    fake.time = 61;
    vi.advanceTimersByTime(500);
    expect(onStatus).toHaveBeenLastCalledWith({ time: 61, duration: 928, playing: true });

    fake.setState(YT_STATE.PAUSED);
    expect(onStatus).toHaveBeenLastCalledWith({ time: 61, duration: 928, playing: false });
  });

  it("counts a second as watched only while the video plays, not during an ad", async () => {
    const { player, fake } = await playing();
    // An ad: YouTube reports the video as unstarted, its time held at 0.
    fake.setState(YT_STATE.UNSTARTED, 0);
    vi.advanceTimersByTime(5000);
    expect(player.watched()).toBe(0);

    fake.setState(YT_STATE.PLAYING, 0);
    for (let second = 0; second < 10; second++) {
      fake.time = second;
      vi.advanceTimersByTime(500);
    }
    expect(player.watched()).toBe(10);
  });

  it("doesn't count what a seek skips, or a second watched twice", async () => {
    const { player, fake } = await playing();
    fake.setState(YT_STATE.PLAYING);
    for (const second of [0, 1, 2, 300, 301, 1, 2]) {
      fake.time = second;
      vi.advanceTimersByTime(500);
    }
    expect(player.watched()).toBe(5);
  });

  it("seeks and asks to play from there", async () => {
    const { player, fake, onStatus } = await playing();
    fake.setState(YT_STATE.PAUSED);
    fake.playRequested = false;
    player.seek(167);
    expect(fake.time).toBe(167);
    expect(fake.playRequested).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith({ time: 167, duration: 928, playing: false });
  });

  it("passes on YouTube's errors, such as a video that can't be embedded", async () => {
    const { fake, onError } = await playing();
    fake.fail(150);
    expect(onError).toHaveBeenCalledWith(150);
  });

  it("stops reporting and removes YouTube's frame when destroyed", async () => {
    const { host, player, fake, onStatus } = await playing();
    player.destroy();
    onStatus.mockClear();
    vi.advanceTimersByTime(5000);
    expect(onStatus).not.toHaveBeenCalled();
    expect(fake.destroyed).toBe(true);
    expect(host.childElementCount).toBe(0);
  });
});

describe("formatTime", () => {
  it.each([
    [0, "00:00"],
    [61.9, "01:01"],
    [928, "15:28"],
    [3725, "1:02:05"],
  ])("writes %d seconds as %s", async (seconds, text) => {
    const { formatTime } = await modules();
    expect(formatTime(seconds)).toBe(text);
  });
});
