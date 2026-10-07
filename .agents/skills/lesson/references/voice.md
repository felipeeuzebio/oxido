# The lessons' voice

How a lesson should sound. It isn't a transcript of Bogdan: it's the course's own voice, built on his way of teaching and written in the official book's register, friendly and direct but a notch more formal than his speech. Writers read this before drafting, the voice judge ranks drafts against it, and the polish uses its sample. It names a few short phrases, never his sentences; the sample at the end is invented.

## His way of teaching, which the lesson keeps

- **The book's examples, in the book's order.** He walks through the chapter's own examples on screen, so the lesson follows the same path.
- **We do it together.** He narrates each step as he does it. In the lesson, "let's" and "we" carry the walkthrough: "Let's create the project." "Now we'll build it."
- **Show, then point.** He runs something, then points at the result. In the lesson: "You can see the executable next to `main.rs`." "Notice that…"
- **Compiler errors as teaching material.** When he hits one, he reads it and fixes it. The lesson shows the error and the fix the same way.
- **The reason in a sentence, at the moment it matters,** then on to the next step. He names a thing and moves on rather than defining everything; a later chapter covers the rest.
- **Concrete cases.** "In this case", "for example", "let's say we…": a rule tied to what's on the screen.
- **His asides, kept light.** The outline's `Aside:` lines carry his jokes and framing. Keep them, in a sentence and with restraint: a touch of humor, not a stand-up bit.

## The register: the course's own, a bit more formal than his speech

- Friendly and direct, like the official book: "we" and "let's" for what we do together, "you" for what's yours to decide or do, contractions.
- Complete, plain sentences. No slang or spoken filler: not "spits out", "spin up", "go ahead and", "there we go", "okay, so".
- Reactions are rare and quiet. Once a step works, the next sentence says what we got ("That gives us an executable called `main`."), not "Great!".
- "Let's" opens real steps, about one paragraph in two at most; it isn't a reflex at the start of every step.
- Don't write "I": the lesson isn't signed by him. Leave out his channel talk (subscribe, see you next time).

## Not the voice

- **A transcript:** his spoken tics copied into text ("okay", "all right", "go ahead and", a "great" after every step).
- **A manual:** one imperative per sentence, every step introduced with a colon and a code block.
- **A textbook:** definitions, "this is called", "in other words", explanations of things he skips.
- **A reference page:** precise and complete, every case covered, no walkthrough.
- **A helpdesk:** warnings for setups he doesn't mention, other platforms' commands, edge cases.
- **Chatbot polish:** "Here's what you need to know", tidy summaries, a closing line about what you've learned.

## Sample

Invented, on a topic no lesson covers, to show the manner rather than the words to reuse:

> Let's say we're halfway through a change and need to switch to another branch. If we try right now, git refuses, because our edits would be overwritten. So let's stash them first. After `git stash`, you can see that the working tree is clean again.
>
> Now we can switch branches, do what we need there and come back. To restore our edits, we run `git stash pop`, and git puts everything back where it was. Notice that the stash itself is gone afterwards: `pop` removes it from the list.
>
> If you've used an editor that keeps snapshots of your work, this is the same idea, except that you decide when the snapshot is taken. And since it's part of git, there's nothing extra to install.
