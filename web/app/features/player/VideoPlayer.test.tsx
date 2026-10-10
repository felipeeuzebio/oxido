import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { finishLoading } from "./fake-youtube";
import { YT_STATE } from "./youtube";

const apiScripts = () =>
  document.head.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]');

// Loaded fresh for each test, so YouTube's API starts out not loaded.
const CHAPTERS = [
  { title: "Getting started", id: null, start: 28 },
  { title: "Install Rust", id: "install-rust", start: 52 },
  { title: "Cargo", id: "cargo", start: 234 },
];

async function show() {
  vi.resetModules();
  const { VideoPlayer } = await import("./VideoPlayer");
  return render(
    <VideoPlayer video="OX9HJsJUDxA" title="Getting started" duration={430} chapters={CHAPTERS} />,
  );
}

const marker = (name: string) => screen.getByRole("button", { name: `Chapter: ${name}` });

const playButton = () =>
  screen.getByRole("button", { name: "Play video: Getting started, from Let's Get Rusty" });

async function press() {
  fireEvent.click(playButton());
  const { players } = finishLoading();
  await waitFor(() => expect(players).toHaveLength(1));
  const player = players[0];
  act(() => player.ready());
  return player;
}

beforeEach(() => {
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
  for (const script of apiScripts()) script.remove();
});

describe("VideoPlayer", () => {
  it("shows the video's thumbnail behind a play button, and loads nothing from YouTube until it's pressed", async () => {
    await show();
    expect(playButton().querySelector("img")?.getAttribute("src")).toBe(
      "https://i.ytimg.com/vi/OX9HJsJUDxA/hqdefault.jpg",
    );
    expect(apiScripts()).toHaveLength(0);
  });

  it("swaps the thumbnail for YouTube's player when pressed", async () => {
    await show();
    const player = await press();
    expect(apiScripts()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Play video/ })).toBeNull();
    expect(screen.getByTitle("YouTube video player")).toBe(player.frame);
  });

  it("shows where the video is in the strip under the player", async () => {
    await show();
    const player = await press();
    act(() => player.setState(YT_STATE.PLAYING, 391));
    expect(screen.getByText("06:31 of 15:28")).toBeTruthy();
    const position = screen.getByRole("progressbar", { name: "Position in the video" });
    expect(position.getAttribute("aria-valuetext")).toBe("06:31 of 15:28");
  });

  it("shows the video's length before it plays", async () => {
    await show();
    expect(screen.getByText("00:00 of 07:10")).toBeTruthy();
  });

  it("marks each chapter on the strip at its moment, named for screen readers", async () => {
    await show();
    expect(marker("Install Rust, 00:52").style.left).toBe(`${(52 / 430) * 100}%`);
    expect(screen.getAllByRole("button", { name: /^Chapter: / })).toHaveLength(3);
  });

  it("starts the video at a chapter picked before it plays", async () => {
    await show();
    fireEvent.click(marker("Cargo, 03:54"));
    const { players } = finishLoading();
    await waitFor(() => expect(players).toHaveLength(1));
    act(() => players[0].ready());
    expect(players[0].time).toBe(234);
    expect(players[0].playRequested).toBe(true);
  });

  it("moves a playing video to the chapter picked", async () => {
    await show();
    const player = await press();
    fireEvent.click(marker("Install Rust, 00:52"));
    expect(player.time).toBe(52);
  });

  it("names the video and its channel under the player", async () => {
    await show();
    expect(screen.getByText("Let's Get Rusty: Getting started")).toBeTruthy();
  });

  it("offers the video on YouTube when the player can't load", async () => {
    await show();
    fireEvent.click(playButton());
    apiScripts()[0].dispatchEvent(new Event("error"));
    const link = await screen.findByRole("link", { name: /Watch it on YouTube/ });
    expect(link.getAttribute("href")).toBe("https://www.youtube.com/watch?v=OX9HJsJUDxA");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("offers it on YouTube too when YouTube won't play it here", async () => {
    await show();
    const player = await press();
    act(() => player.fail(150));
    expect(await screen.findByRole("link", { name: /Watch it on YouTube/ })).toBeTruthy();
  });

  it("removes YouTube's player when the page goes away", async () => {
    const view = await show();
    const player = await press();
    view.unmount();
    expect(player.destroyed).toBe(true);
  });
});
