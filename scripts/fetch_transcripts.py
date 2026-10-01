#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "youtube-transcript-api>=1.2",
#     "yt-dlp>=2026.8.19",
# ]
# ///
"""
Dump the transcripts of every video in Let's Get Rusty's "The Rust Lang Book"
playlist so they can be used as reference material for Oxidō's text lessons.

Run from the repository root with uv, which installs the packages listed
above on the first run:
    uv run scripts/fetch_transcripts.py
    uv run scripts/fetch_transcripts.py --out transcripts --lang en --delay 2

YouTube changes often break yt-dlp until a new release fixes it. If listing
the playlist fails, `uv run --upgrade scripts/fetch_transcripts.py` gets the
newest one.

YouTube blocks home connections that ask too often (and cloud servers always).
When it blocks this one, the script waits and tries the same video again,
after 5, 10, 20, 40, 60 and 60 minutes, and stops only if it's still blocked.
Ctrl+C stops it at any point; the next run picks up where it left off.

Output (inside --out):
    playlist.json          index of all videos (position, id, title, duration, status)
    NN_<videoId>.json      raw snippets [{text, start, duration}, ...] + metadata
    NN_<videoId>.md        readable transcript, one line per snippet, [mm:ss] prefixed

Re-running skips videos that already have a .json file, so if YouTube rate-limits
you halfway through, just run it again later.

`transcripts/` is git-ignored: they are Bogdan's words and only reference
material for writing the lessons, never lesson text (see CLAUDE.md).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import yt_dlp
    from youtube_transcript_api import (
        IpBlocked,
        NoTranscriptFound,
        RequestBlocked,
        TranscriptsDisabled,
        VideoUnavailable,
        YouTubeTranscriptApi,
    )
except ImportError:
    sys.exit("Missing packages. Run it with uv, which installs them: uv run scripts/fetch_transcripts.py")

PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLai5B987bZ9CoVR-QEIN9foz4QCJ0H2Y8"

# Minutes to wait before each retry after YouTube blocks this IP (3h15 in all).
BLOCKED_WAITS = [5, 10, 20, 40, 60, 60]


def list_playlist(url: str) -> list[dict]:
    """Return [{position, id, title, duration}] for every entry, in playlist order."""
    opts = {"extract_flat": "in_playlist", "quiet": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    videos = []
    for pos, entry in enumerate(info.get("entries") or [], start=1):
        if not entry or not entry.get("id"):
            continue
        videos.append(
            {
                "position": pos,
                "id": entry["id"],
                "title": entry.get("title"),
                "duration": entry.get("duration"),  # seconds, may be None
                "url": f"https://www.youtube.com/watch?v={entry['id']}",
            }
        )
    return videos


def fmt_ts(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h:d}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"


def pick_transcript(api: YouTubeTranscriptApi, video_id: str, lang: str):
    """Prefer a human-made transcript, fall back to YouTube's auto-generated one."""
    tlist = api.list(video_id)
    try:
        return tlist.find_manually_created_transcript([lang])
    except NoTranscriptFound:
        return tlist.find_generated_transcript([lang])


def fetch_waiting(api: YouTubeTranscriptApi, video_id: str, lang: str, label: str):
    """The video's transcript, waiting out YouTube's blocks; None if it's still
    blocked after the last wait. Other errors (no transcript, video gone) are raised."""
    waits = iter(BLOCKED_WAITS)
    while True:
        try:
            return pick_transcript(api, video_id, lang).fetch()
        except (IpBlocked, RequestBlocked):
            wait = next(waits, None)
            if wait is None:
                return None
            print(f"{label}: YouTube is blocking requests from this IP. Trying again in {wait} minutes (Ctrl+C stops).")
            time.sleep(wait * 60)


def fetch_all(videos: list[dict], out: Path, lang: str, delay: float) -> None:
    """Writes each video's transcript and sets its status; stops if YouTube keeps blocking."""
    api = YouTubeTranscriptApi()
    for v in videos:
        stem = f"{v['position']:02d}_{v['id']}"
        json_path = out / f"{stem}.json"
        if json_path.exists():
            v["status"] = "ok (cached)"
            continue

        label = f"[{v['position']:02d}/{len(videos)}] {v['title']}"
        try:
            fetched = fetch_waiting(api, v["id"], lang, label)
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
            v["status"] = f"skipped: {type(e).__name__}"
            print(f"{label}: {v['status']}")
            continue
        if fetched is None:
            v["status"] = "blocked"
            print(f"{label}: still blocked after waiting {sum(BLOCKED_WAITS)} minutes. Stopping; run it again later.")
            return

        snippets = fetched.to_raw_data()
        v["status"] = "ok"
        v["transcript_language"] = fetched.language_code
        v["auto_generated"] = fetched.is_generated

        json_path.write_text(
            json.dumps({**v, "snippets": snippets}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        lines = [f"# {v['position']:02d}. {v['title']}", "", f"<{v['url']}>", ""]
        lines += [f"[{fmt_ts(s['start'])}] {s['text']}" for s in snippets]
        (out / f"{stem}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

        kind = "auto" if fetched.is_generated else "manual"
        print(f"{label}: {len(snippets)} lines ({kind})")
        time.sleep(delay)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--playlist", default=PLAYLIST_URL)
    ap.add_argument("--out", default="transcripts")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds to wait between videos")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    print("Listing playlist...")
    videos = list_playlist(args.playlist)
    print(f"Found {len(videos)} videos.")

    try:
        fetch_all(videos, out, args.lang, args.delay)
    except KeyboardInterrupt:
        print("\nStopped. The next run picks up where this one left off.")

    (out / "playlist.json").write_text(json.dumps(videos, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = sum(1 for v in videos if str(v.get("status", "")).startswith("ok"))
    print(f"\nDone: {ok}/{len(videos)} transcripts in {out.resolve()}")
    print("Draft a lesson from them with the lesson skill: .agents/skills/lesson/SKILL.md")


if __name__ == "__main__":
    main()
