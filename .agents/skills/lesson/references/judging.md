# The judges

Read this before Step 4. There are three judges, each answering a different question, so one of each is enough; the gate's scripts are a free fourth. Each judge runs as a fresh subagent that sees only what's listed under it: not the session, not the transcript, not which writer wrote which draft, and not the other judges. Shuffle the drafts and relabel them A, B and C first, so no judge can favor the first one.

Every judge returns the same shape:

```
## Draft A
- Findings: [each with a short quote as evidence]
- Biggest single fix:
## Draft B ...
## Draft C ...
## Ranking: X > Y > Z
## One thing the other judges will probably miss:
```

## Voice judge

Its ranking picks the winner among the drafts that pass fidelity (Step 5), so it judges first how well each draft teaches the way Bogdan does, in the lessons' voice, and AI-writing patterns second. It also flags paragraphs to split, which don't count toward the ranking.

Give it the three draft paths, the paths of `SKILL.md` (for the paragraph rule in "The lesson"), `references/voice.md` and the `humanizer` skill (`.agents/skills/humanizer/SKILL.md`), each draft's `avoid-ai-writing` findings from the gate, and 3 to 5 paragraphs from approved lessons as more samples of the voice, once there are any.

Prompt core:

> You are the voice judge for three drafts (A, B, C) of a lesson that turns a Rust video into text. voice.md describes the voice a lesson should have: the presenter's way of teaching (walking through the book's examples with the reader, showing then pointing, the reason in a sentence, his asides kept light) in the course's own register, friendly and direct like the official book but a notch more formal than his speech. It has a sample. You don't know who or what wrote the drafts; judge only the text.
>
> First, voice. For each draft, quote the lines that fit voice.md best and worst, and say whether it reads like a friendly walkthrough or like a transcript of someone talking (slang, spoken filler, a "great" after every step), a manual, a textbook, a reference page or a helpdesk. Check that the asides are there and kept light.
>
> Then AI patterns. Read the humanizer skill's patterns. The findings list what a pattern catalog already caught; judge what it can't: staged openers, one-line closers, forced triads, every section shaped the same, inflated significance, chatbot residue. Count and quote them; people who judge AI text by feel do little better than chance. A "let's" before a real step and the asides are the voice, not tells, and headings that name his steps are the lesson's structure, not a template. Ignore code blocks, commands and shown output entirely.
>
> Last, paragraphs. Read SKILL.md's rule on one subject per paragraph. For each draft, go paragraph by paragraph, name each one's subject, and list every paragraph that turns to a new subject partway through, quoting the sentence where it turns. That can be a new command after a step's result or after another command, an aside after its point, or an instruction after an explanation of code. These are fixes for the winner; they don't change your ranking.

## Fidelity judge

Give it the three draft paths; the outline's path; the path of this skill's `SKILL.md`; `CLAUDE.md`'s content rules; the "Introduces" lists of earlier outlines; the maintainer's fixed choices for this class; and the allowed links.

Prompt core:

> You are the fidelity judge. Read the "The lesson" section of SKILL.md, then grade each draft on each point of the rubric below as Pass, Weak or Fail, quoting evidence. For coverage, go through the outline's numbered points one at a time and give each draft's lines that cover the point. Then check that those lines come in the outline's order, and list every sentence that covers no point. Run the code: save each rust block and compile it, and run the draft's commands in a fresh temporary folder. A shown output that doesn't match what you got is a Fail on code truth. Rank by the rubric's rule.

The rubric:

1. **Coverage:** every outline point is covered. Give the lines that cover each one.
2. **Order:** the points appear in the outline's order. The first line covering a point never comes before the first line covering the point before it.
3. **Nothing added:** every paragraph supports an outline point, or is a marked note, a link, or today's version of a setup detail. A reason, warning, platform variant or explanation of output that the outline doesn't have is an addition, even inside a sentence that supports a point. List each one. His voice isn't an addition: reactions ("okay, it built"), pointing at a result ("you can see…"), transitions between his steps, and the outline's `Aside:` lines in new words.
4. **Claims kept:** his claims are kept as he states them. Corrections appear only as marked notes after the point, and changed setup details are given as they are today, without a note.
5. **Level and length:** his level, in the register `voice.md` describes (friendly and direct, a notch more formal than his speech), abridged (a seven-minute video makes a few hundred words), with no explanation he doesn't give.
6. **Course rules:**
   - Links only for docs, extensions, tools and libraries: first mention, by name, never an editor or IDE.
   - VS Code as the course's editor, without reading as VS Code only.
   - Only Rust from this video or earlier ones.
   - New real-world examples, except the maintainer's fixed choices.
7. **Code truth:** every `rust` block compiles, shown output is real, and every command works as written in a fresh folder.

Ranking: fewest Fails, then fewest Weaks. A Fail on 1, 2, 3 or 7 can't win.

## Beginner judge

Give it the three draft paths and the learner. Describe the learner as "a student who has taken classes 1 to N-1 of this course and knows only the Rust in these lists: …, with a terminal, VS Code and Rust installed". For class 1, describe someone who can use a terminal and has never installed Rust. Don't give it the outline, `SKILL.md` or the transcript: it judges by experience, not by the rules.

Prompt core:

> Role-play this exact learner: {learner}. Work through each draft literally, top to bottom, in a fresh temporary folder: run every command it tells you to and create every file it describes. Don't fill gaps from what you know. If the draft doesn't say it, you don't know it. For each action, cite the sentence that told you to do it, and stop at the first step the draft doesn't cover. Report each problem with the quote that caused it, in two lists. Blocking: a step that fails as written (a command that errors, a file or folder you can't find, a step that's missing). Unclear: a term you didn't know, a step you could still do but had to think about. Also report where you were bored. Rank the drafts by how far this learner gets before giving up.

Capable models asked to play novices still fill gaps the way experts do. The "you don't know it" and "cite the sentence" rules are the defense. Treat this judge's findings as leads to check, not proof.
