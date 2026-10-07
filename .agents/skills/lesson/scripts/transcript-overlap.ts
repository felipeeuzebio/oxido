// Finds wording a lesson or outline shares with a video's transcript. Lessons use
// new words (decision D6), so every run of 8 or more shared words gets rewritten.
// Skips front matter, code blocks and timestamps. Exits with 1 when it finds a
// run. Transcripts are git-ignored, so this runs locally, not in CI.
//
//   node .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/12_<videoId>.md <file>...
import { readFileSync } from "node:fs";

const TIMESTAMP = /\[\d{1,2}:\d{2}(?::\d{2})?\]/g;

const words = (text: string) =>
  text
    .replace(TIMESTAMP, " ")
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Every run of at least `minWords` words in `text` that the transcript also says, in order. */
export function copiedRuns(transcript: string, text: string, minWords = 8): string[] {
  // The transcript's title and link lines aren't speech; front matter and code aren't prose.
  const source = words(transcript.replace(/^[#<].*$/gm, ""));
  const target = words(
    text.replace(/^(\+\+\+|---)\n[\s\S]*?\n\1\n/, "").replace(/^(```|~~~)[\s\S]*?^\1/gm, ""),
  );
  const phrase = (list: string[], at: number) => list.slice(at, at + minWords).join(" ");

  const said = new Set<string>();
  for (let at = 0; at + minWords <= source.length; at += 1) said.add(phrase(source, at));
  const copied = (at: number) => at + minWords <= target.length && said.has(phrase(target, at));

  // Overlapping copied phrases form one run, reported once at its full length.
  const runs: string[] = [];
  for (let start = 0; start + minWords <= target.length; start += 1) {
    if (!copied(start)) continue;
    let last = start;
    while (copied(last + 1)) last += 1;
    runs.push(target.slice(start, last + minWords).join(" "));
    start = last;
  }
  return runs;
}

if (import.meta.main) {
  const [transcriptPath, ...files] = process.argv.slice(2);
  if (!transcriptPath || files.length === 0) {
    console.error(
      "Usage: node .agents/skills/lesson/scripts/transcript-overlap.ts <transcript.md> <file>...",
    );
    process.exit(2);
  }
  const transcript = readFileSync(transcriptPath, "utf8");
  const found = files.flatMap((file) =>
    copiedRuns(transcript, readFileSync(file, "utf8")).map((run) => `${file}: "${run}"`),
  );
  console.log(found.join("\n") || "No wording shared with the transcript.");
  if (found.length > 0) console.log(`${found.length} run(s) to rewrite.`);
  process.exit(found.length > 0 ? 1 : 0);
}
