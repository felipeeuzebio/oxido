---
name: lesson
description: Draft or update one Oxidō text lesson from its Let's Get Rusty video. Writes an outline of Bogdan's points in new words first, then drafts the lesson from it as a tournament (three writer agents, a gate of scripts, three blind judges, a humanizer pass) and checks both for wording copied from the transcript. Use when writing, revising, reviewing or checking the lesson for a class, e.g. "lesson 12", "write the lesson for the ownership video" or "review lesson 1".
---

# Draft a lesson

Each class is one of Bogdan's videos plus a text lesson that teaches the same points in the same order, in new words (decision D6). This skill drafts that lesson in two parts: an outline of what the video teaches, then the lesson written from the outline. The maintainer reviews both in one PR; the outline is what the lesson gets checked against, since the transcript never leaves the maintainer's machine (decision D24).

The lesson is drafted as a tournament (decision D28). Three writers draft it from the outline alone, scripts check each draft, and three judges who don't know who wrote what pick the winner and say what to fix. One agent drafting alone grades its own work, and it drifts toward the book's tone or toward an earlier draft it has seen.

The class is given as its position in the playlist (`12`) or the video's title. One class per run. Quizzes and build steps aren't part of this skill.

Modes:

- **Full** (default): Steps 1 to 6.
- **Quick** ("quick", "single writer"): write the one draft yourself, following "The lesson", then run Step 3 and Step 6. No writers or judges.
- **Review** ("review lesson 1"): run Steps 3 and 4 on the lesson as it is, and report what they found. An approved lesson is never rewritten from scratch; see "New lesson or update?".

## Read first

1. `CLAUDE.md`, especially "Content rules". They override anything here.
2. `docs/roadmap-course.md`: "Class format", "Content format" (file names, front matter, the Markdown lessons can use), and the phase this video belongs to.
3. `content/course.toml`: the phase and chapters for this video.
4. The outlines in `content/outlines/` for earlier videos. Their "Introduces" lists say which Rust features students know so far. Skim one or two earlier lessons for tone and depth.
5. The transcript: `transcripts/NN_<videoId>.md`. If it's missing, run `uv run scripts/fetch_transcripts.py`, which downloads the ones not there yet. It needs network access and YouTube sometimes blocks it; if it fails, stop and tell the maintainer.
   The transcripts are YouTube's automatic captions, which often mishear Rust words (`impl`, `&mut`, crate names). When a line doesn't make sense, check the video before it goes into the outline.
6. The book chapter the video covers. The videos follow the book chapter by chapter, demonstrating its own examples in its order, so the lesson and the book go hand in hand, and the lesson never contradicts the book without a note.
   - [*The Rust Programming Language*](https://doc.rust-lang.org/book/), the official book, is the model (decision D29): the Rust facts and terms, the order within a chapter, the examples he demonstrates, and the framing of a concept, ownership included ("a third approach" between garbage collection and managing memory yourself, which his video expands). Its register, friendly and direct with "we" and "let's", is the register `references/voice.md` asks for. Take its facts and framing, never its sentences. When the transcript is unclear, the book settles what he meant.
   - [The Rust Book (Abridged)](https://jasonwalton.ca/rust-book-abridged/) by Jason Walton: what can be cut and what can't, at about half the book's words. Not a model for tone, and leave out its comparisons with other languages, which he doesn't make.
   - [Comprehensive Rust](https://google.github.io/comprehensive-rust/), Google's course for developers: a fallback only, for when the book's explanation of one of his points is heavy going. Use its framing for that point, never its examples, extra points or order.

## New lesson or update?

If `content/outlines/NN-*.md` already exists, this is an update. The maintainer has edited and approved those files, so never rewrite them from scratch:

- `cargo xtask content` warns about each lesson whose outline changed after it was written, with the fingerprint to record once the lesson follows the outline again.
- Run the Review mode if it helps, then propose specific edits as a diff, say why each one is needed, and wait for the maintainer before applying them.

## Step 1: the outline

Write `content/outlines/NN-<slug>.md`, with the playlist position and a short slug from the video title:

```markdown
+++
video = "<videoId>"
title = "<the video's title>"
+++

1. [mm:ss] <one point Bogdan makes, in your own words>
2. [mm:ss] <the next point, in the order he makes it>
   - Note: <only if he says something wrong or since changed: what he claims, and what's true now>
   - Aside: <a joke, reaction or framing of his at this point, in your own words>
3. [mm:ss] Demo: <what his example shows, described, never copied>

## Introduces

- <each Rust feature or tool this video teaches for the first time, e.g. `&mut`, `cargo test`>
```

- One line per point, in the video's order, with the time he makes it. Cover every point he teaches, including asides that teach something.
- Record his claims as he states them, mistakes included. Flag a mistake with a `Note:` line under the point; don't fix the point itself.
- Record how he says it, too: each joke, reaction or framing that shows his personality ("luckily, Rust has this built in", a joke about putting Rust on your resume) goes in an `Aside:` line under its point, described in new words. Leave out channel talk (subscribe, see you next time). Writers never see the transcript, so this is the only way his personality reaches them.
- Describe his code; don't reproduce it.
- No quotes. The outline is in new words like the lesson, and it's committed.

## The lesson

The lesson is the video in text form: someone who reads it instead of watching learns the same things, in the same order, at the same level. It's written from the outline, not from the transcript; only you go back to the transcript, to settle what he meant. Every writer and judge works from these rules.

- It goes in `content/en/<phase>/NN-<slug>.md`, named like its outline, in the format "Content format" describes. Its `outline` is set last, once the outline is final: `sha256:` and the outline file's SHA-256 (`sha256sum <file>`, or `shasum -a 256` on macOS).
- Follow his walkthrough: the steps he takes, in his order, and the points he makes along the way. Cover every outline point. Section headings name his steps ("Install Rust", "Build and run"), and only the ones a student would scroll back to.
- Teach the way he does, in the course's own voice: walk through each step with the reader ("let's", "we"), point at what happened ("you can see"), give the reason in a sentence. The register is the official book's, friendly and direct but a notch more formal than his speech: no slang, spoken filler or a "great" after every step. `references/voice.md` describes it, with a sample; a lesson that reads like a transcript, a manual, a textbook or a reference page misses it. Explain what he explains, with the book's facts and terms in your own words, never the book's sentences. Don't add topics the video doesn't cover, even when the chapter has them, and don't add edge cases. For ownership (the videos on chapter 4), keep the book's framing, which is his.
- Carry each `Aside:` line of the outline into the lesson, in new words, where he makes it, and keep it light: a sentence, not a bit. That's his personality, not an addition.
- Add nothing the video doesn't have. That includes help he doesn't give: no other platform's command or message, no warning about a failure he doesn't hit, no reason he doesn't state, no explanation of output he doesn't explain. A student on another setup can follow the book's page the lesson links: where the lesson has the student install something, point to that page's troubleshooting section when it has one, instead of covering problems the video doesn't. It also rules out predict-the-output prompts, tracing questions, exercises and review questions. Those belong in the quizzes and the build steps. Interesting but unrelated material makes students learn less, so leaving it out is the teaching choice.
- Keep his claims about Rust as he states them. When one is wrong, or has changed in a way that would trip a student up, add a short note right after it (`> Note: ...`), never a replacement.
- Details of his setup that have changed (editor menus, which extension is listed first, the version numbers on his screen) aren't claims. Give today's instruction directly, with no note and no story of what changed.
- Where he copies something from the book, such as the install command, link to the book's page instead of copying it.
- Link what the lesson points to outside the course, when it's one of these: docs (the book's chapter, official documentation), an extension (its VS Code Marketplace page), a tool (rustup, Cargo plugins) or a library (its docs.rs or crates.io page). Don't link editors and IDEs, or anything else outside those kinds. Link the first mention only, with the thing's name as the link text, and check that each address opens.
- Use new, real-world code examples: not his and not the book's, and only Rust that this video or earlier ones introduce. Keep each one to about 15 lines, and build longer programs in the stages he does. Show what the student types; when the lesson returns to a file, show the changed lines and say where they go. Every block must be safe to paste where the lesson says: name the file, and never redeclare what's already there.
- A video's words are gone once he says them, and text stays. When he shows output or an error, the lesson shows the real one, word for word. When you can't see exactly what his screen says, describe it the way he does instead of showing another system's output. If he hits an error and fixes it, show the error and the fix. Show other output only when it's the point.
- Keep each explanation next to its code, and don't narrate what the code already shows. Say where a step happens the way he does ("cd into it", "open it in the editor"), and don't hand-hold more than he does.
- One subject per paragraph, the way the official book groups its text. Start a new paragraph wherever the text turns to something else, even after a single sentence. For example, each new command or tool gets its own paragraph, whether it follows a step's result or another command (the book introduces `cargo check` in a paragraph of its own). So does an aside, after the point it follows (the book's "congratulations" after hello world stands alone). So do other platforms or troubleshooting, after the steps, and an instruction such as saving the file, after an explanation of the code. The outline's points are a guide: a paragraph rarely covers two of them, and a point with several subjects gets several paragraphs. A paragraph may end by leading into the code block or step that follows when that's about the same thing ("Cargo comes with Rust. Let's check that it's installed."). One-sentence paragraphs are fine, and length alone is no reason to split.
- Keep what the computer does accurate. Plain shorthand such as "Rust won't let you" or "the compiler tells us" is fine.
- The course uses VS Code, and lessons show it where a video does, but students can use any editor with Rust support, so a lesson never reads as VS Code only. Where the editor first matters, say once that the course uses VS Code and that other editors work too, linking rust-analyzer's [setup for other editors](https://rust-analyzer.github.io/book/other_editors.html) when it helps. Elsewhere say "your editor", and keep VS Code-only steps (a menu, a prompt) short and marked as VS Code's.
- Keep it short by cutting repetition and channel talk, not the walkthrough. A seven-minute video makes a lesson of a few hundred words.

## Step 2: three drafts

Gather what the writers need:

- the outline's path, the video ID, the phase folder and slug;
- the "Introduces" lists of every earlier outline: the only Rust a lesson may use;
- the maintainer's fixed choices for this class, if any (lesson 1 uses the book's hello world);
- the links the lesson may use, each one checked to open;
- once lessons are approved, 3 to 5 of their paragraphs as voice examples, in `<example>` tags.

Writers and judges never get the transcript, this session, or any existing version of this lesson. They write from scratch.

Spawn 3 general-purpose subagents in one message. Each gets those inputs; the path of this file, with the instruction to read `references/voice.md` and its sample first, then "The lesson", then the official book's chapter, the model for facts, framing and register (Walton's version is optional, for what to cut); its lens; and where to save its draft: `draft_1.md`, `draft_2.md` or `draft_3.md`, in a scratch folder outside the repository. The lenses change the surface, never the coverage. Every draft covers every outline point, in order, and follows "The lesson".

- **Writer 1, Lean:** the shortest lesson that still covers every point and still teaches the way he does. Only the headings a student would scroll back to, only the code blocks a student would copy; cut words, never his voice.
- **Writer 2, Narrator:** closest to his walkthrough. Take the reader through each step the way he does on screen, in the lessons' voice, with code blocks only where the student types or copies something.
- **Writer 3, Demo:** closest to how he shows things. Run each step, then point at what we see; try a variant ("let's say we…") where he does; carry the error and the fix where he hits one.

Each draft is a complete lesson file with its front matter. Code must be real: every `rust` block compiles, any output shown was produced by running it, and every command works as written in a fresh folder. A writer that thinks the lesson needs something the video doesn't have says so in its report and leaves it out.

## Step 3: the gate

For each draft:

1. Run the `avoid-ai-writing` skill (`.agents/skills/avoid-ai-writing/`) in detect mode on the draft's prose (its front matter and code blocks aren't prose), with the `technical-blog` context. Tell it the text is a tutorial that walks the reader through each step: a "let's" that leads into a real step is an invitation to act, not a transition.
2. Run these from the repository root. `transcript-overlap.ts` is TypeScript, which Node 24 or later runs as it is (`node --version`); an older one may exit without checking anything.

```sh
# Wording shared with the transcript: must report none
node .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/NN_<videoId>.md <draft>
# It compiles as this lesson, and its rust blocks compile
tmp=$(mktemp -d) && cp -r content "$tmp/content" \
  && cp <draft> "$tmp/content/en/<phase>/NN-<slug>.md" \
  && cargo xtask content --content "$tmp/content" --out "$tmp/out" \
  && cargo xtask check-code --content "$tmp/content"; rm -rf "$tmp"
```

- Shared wording or a compile failure: send the draft back to its writer once with the report ("fix these, change nothing else") and check again. If it still fails, the draft is out.
- AI-writing findings: none or only P2, pass. P1 findings: pass, and give them to the voice judge. Any P0 finding: back to its writer once with the findings, then go on regardless. The judges and the polish catch the rest.

## Step 4: three blind judges

Read `references/judging.md`, shuffle the drafts and relabel them A, B and C, keeping the mapping to yourself. Then spawn the three judges in one message:

1. **Voice judge:** how well the draft teaches the way he does, in the lessons' voice (`references/voice.md` and its sample), first; AI-writing patterns second.
2. **Fidelity judge:** every outline point covered, in order, with nothing added, and the course's rules. It runs the code.
3. **Beginner judge:** a student who knows only what earlier classes taught. It follows each draft literally and runs its commands in a scratch folder.

## Step 5: pick and fix the winner

- The winner is the voice judge's top draft among those with no Fail on coverage, order, additions or code truth. Fidelity is the gate, since a lesson that drops or reorders his points breaks the course's first rule; past the gate, sounding like him decides.
- Take a section from a losing draft only when a judge singled it out as better, and rewrite its seams in the winner's voice. Don't stitch three drafts into one.
- Apply the fidelity judge's fixes, the voice judge's fixes, and the beginner judge's fixes where a step fails as written (a wrong folder, an unsaved file), all within "The lesson". No fix may flatten the voice: make the step work, in the lesson's words. A fix may reword, make a step explicit (which folder, which file, what to type) or reorder within one point. It may not add a topic, an explanation, a warning or a platform variant the video doesn't give. A confusion that needs one, including one caused by a setup he doesn't use (another OS or shell, a missing linker), goes to the maintainer in the hand-off, never into the lesson.
- Split each paragraph the voice judge flags as turning to a new subject partway through, at the sentence it quotes. A split changes no words.
- When judges conflict, fidelity wins wherever voice would cut or merge an outline point, and voice wins in the prose between points.

## Step 6: polish and checks

1. Save the winner as `lesson_winner.md` in the scratch folder and copy it to `lesson_final.md`.
2. Run the `humanizer` skill (`.agents/skills/humanizer/`) on `lesson_final.md` in its embedded mode, as a separate pass, with the sample in `references/voice.md` as its writing sample, so it matches the lessons' voice instead of making the text neutral and plain. The walkthrough's "let's" and "we", and the asides, are deliberate. Mark every tell, rewrite, and check the result for the five tells that most often survive. Prose only: never touch fenced code, inline code, commands, paths or shown output.
3. Check that the pass left code and structure alone with the `avoid-ai-writing` skill's mechanical check, the preservation validator its edit mode describes, with `lesson_winner.md` as the original and `lesson_final.md` as the rewrite. It must report no mechanical preservation errors; if it does, restore those parts and check again.
4. Run the `avoid-ai-writing` skill in detect mode on `lesson_final.md` again, as in Step 3. Aim for no P0 or P1 findings, and keep the winner instead if the pass added findings.
5. Read `lesson_final.md` one paragraph at a time, asking of each one what its subject is. Split any paragraph with two subjects, as "The lesson" describes, since the judge may have missed one and a rewrite can merge paragraphs.
6. Write it to its place in `content/en/`, with the `outline` fingerprint set last.
7. Check the outline and the lesson for wording copied from the transcript, and rewrite every run it reports until it reports none. The last rewrite is where copied wording comes back.

   ```sh
   node .agents/skills/lesson/scripts/transcript-overlap.ts transcripts/NN_<videoId>.md content/outlines/NN-<slug>.md <lesson file>
   ```

8. Run `cargo xtask content` and `cargo xtask check-code`, and fix what they report.

## Hand off to the maintainer

Print a review list and stop:

- Each outline point with its `[mm:ss]`, next to the lesson section that covers it, so the maintainer can check the order against the video.
- Every `Note:` in the outline and every marked note in the lesson.
- The overlap check's result, the humanizer's changes (or "no tells"), the AI-writing findings left, if any, and how the voice judge rated the voice.
- Any Rust in the examples that isn't in an "Introduces" list so far. There should be none.
- Which draft won and why, in one line; the strongest dissent among the judges and why you overruled it; the beginner judge's confusions that needed new content; and where the drafts are.

Commit and open the PR only when the maintainer says to, following `.github/commit-instructions.md` (`feat(content): add lesson <n> on <topic>`) and `.github/pr-instructions.md`. Commits, PRs and review comments are public, so never quote the transcript in them. Once the English lesson is approved, offer to draft the pt-BR translation, following the translation rules in `CLAUDE.md` and `docs/glossary-pt-BR.md`.

## Files

| File | What it's for |
| --- | --- |
| `references/judging.md` | Step 4: the judges' prompts, and the fidelity judge's rubric |
| `references/voice.md` | Steps 2, 4 and 6: the lessons' voice, his way of teaching in the book's register, with a sample |
| `scripts/transcript-overlap.ts` | Steps 3 and 6: wording shared with the transcript |

It also uses two other skills in this repository, each copied unchanged from upstream with its license:

- `humanizer` (`.agents/skills/humanizer/`): Step 6's polish pass, and the voice judge's list of AI patterns.
- `avoid-ai-writing` (`.agents/skills/avoid-ai-writing/`): its detect mode in Steps 3 and 6, and its mechanical check in Step 6.
