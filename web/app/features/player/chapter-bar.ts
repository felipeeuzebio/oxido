// The strip under the video, split into chapters the way YouTube splits its
// progress bar (decision D34).

/** A part of the lesson and when it starts in the video, in seconds. */
export interface ChapterMark {
  title: string;
  id: string | null;
  start: number;
}

/** A stretch of the strip: its chapter, where that chapter starts, and the span it covers. */
export interface Segment {
  title: string;
  start: number;
  from: number;
  to: number;
}

/**
 * One segment per chapter, each running to the next chapter. The first starts
 * at the beginning, so whatever plays before the first point (the channel's
 * intro) belongs to it, and the last runs to the end of the video.
 */
export function segments(chapters: ChapterMark[], length: number, title: string): Segment[] {
  if (chapters.length === 0) return [{ title, start: 0, from: 0, to: length }];
  return chapters.map((chapter, index) => ({
    title: chapter.title,
    start: chapter.start,
    from: index === 0 ? 0 : chapter.start,
    to: chapters[index + 1]?.start ?? length,
  }));
}

/** How much of a segment has played, from 0 to 1. */
export function filled(segment: Segment, time: number): number {
  const span = segment.to - segment.from;
  if (span <= 0) return time >= segment.to ? 1 : 0;
  return Math.min(Math.max((time - segment.from) / span, 0), 1);
}

/** The segment a moment falls in; the last one holds the very end. */
export function segmentAt(all: Segment[], time: number): Segment | undefined {
  return all.find((segment) => time < segment.to) ?? all.at(-1);
}
