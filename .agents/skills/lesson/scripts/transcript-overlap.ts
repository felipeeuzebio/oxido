// Finds wording a lesson or outline shares with a video's transcript. Lessons use
// new words (decision D6), so every run of 8 or more shared words gets rewritten.
// Skips front matter, code blocks and timestamps. Exits with 1 when it finds a
// run. Transcripts are git-ignored, so this runs locally, not in CI.
//
//   node .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/12_<videoId>.md <file>...
import { readFileSync } from "node:fs";
import { copiedRuns } from "./copied-runs.ts";

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
