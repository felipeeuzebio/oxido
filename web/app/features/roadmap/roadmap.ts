// What the roadmap shows, worked out from the compiled course and the student's
// progress: the belts joined end to end (decision D20), the phases, and the
// lesson to continue with.
import type { Course, LessonSummary, Phase } from "../content/types";

/**
 * What the student has done, as the roadmap reads it: how many of each phase's
 * stripes are earned, counted from the first. Empty until progress tracking
 * fills it.
 */
export interface Progress {
  stripes: Record<string, number>;
}

export const NO_PROGRESS: Progress = { stripes: {} };

export type StripeState = "earned" | "next" | "open";

export interface BeltView {
  id: string;
  /** "White", from the ID. */
  name: string;
  /** One per stripe, in order across the belt's phases. */
  stripes: StripeState[];
  earned: number;
  total: number;
  /** Every stripe earned. */
  sealed: boolean;
  /** Holds the next stripe: "You are here". */
  current: boolean;
}

export interface PhaseView {
  id: string;
  title: string;
  summary: string;
  /** 3 for p03; null for a phase outside the numbering, like the kickoff. */
  number: number | null;
  /** The book chapters, as `chapterRange` writes them. */
  chapters: string;
  belt: string | null;
  earned: number;
  total: number;
  /** null for a phase without stripes. */
  status: "done" | "current" | "todo" | null;
}

export interface NextStripe {
  belt: string;
  phase: string;
  /** Its place in the belt, from 1. */
  number: number;
  /** The belt's stripe count. */
  of: number;
  text: string;
}

export interface Roadmap {
  belts: BeltView[];
  phases: PhaseView[];
  earned: number;
  total: number;
  /** Any stripe earned yet. */
  started: boolean;
  /** null once every stripe is earned. */
  next: NextStripe | null;
  /** The lesson the Continue card opens, and its phase. */
  resume: { lesson: LessonSummary; phase: PhaseView } | null;
}

export function roadmap(course: Course, progress: Progress = NO_PROGRESS): Roadmap {
  const earnedIn = (phase: Phase) =>
    Math.min(Math.max(progress.stripes[phase.id] ?? 0, 0), phase.stripes.length);
  const phaseById = new Map(course.phases.map((phase) => [phase.id, phase]));
  const beltOf = new Map(
    course.belts.flatMap((belt) => belt.phases.map((phase) => [phase, belt.id] as const)),
  );

  // Every stripe in course order, numbered within its belt. The first one not
  // earned is next.
  const all = course.belts.flatMap((belt) => {
    const stripes = belt.phases.flatMap((id) => {
      const phase = phaseById.get(id);
      if (!phase) return [];
      const earned = earnedIn(phase);
      return phase.stripes.map((text, i) => ({ phase: id, text, earned: i < earned }));
    });
    return stripes.map((stripe, i) => ({
      ...stripe,
      belt: belt.id,
      number: i + 1,
      of: stripes.length,
    }));
  });
  const first = all.find((stripe) => !stripe.earned);
  const next: NextStripe | null = first
    ? { belt: first.belt, phase: first.phase, number: first.number, of: first.of, text: first.text }
    : null;

  const belts = course.belts.map((belt): BeltView => {
    const own = all.filter((stripe) => stripe.belt === belt.id);
    const earned = own.filter((stripe) => stripe.earned).length;
    return {
      id: belt.id,
      name: belt.id.charAt(0).toUpperCase() + belt.id.slice(1),
      stripes: own.map((stripe) => (stripe.earned ? "earned" : stripe === first ? "next" : "open")),
      earned,
      total: own.length,
      sealed: own.length > 0 && earned === own.length,
      current: first?.belt === belt.id,
    };
  });

  const phases = course.phases.map((phase): PhaseView => {
    const earned = earnedIn(phase);
    const total = phase.stripes.length;
    const number = /^p(\d+)$/.exec(phase.id);
    return {
      id: phase.id,
      title: phase.title,
      summary: phase.summary,
      number: number ? Number(number[1]) : null,
      chapters: chapterRange(phase.chapters),
      belt: beltOf.get(phase.id) ?? null,
      earned,
      total,
      status:
        total === 0
          ? null
          : earned === total
            ? "done"
            : next?.phase === phase.id
              ? "current"
              : "todo",
    };
  });

  const earned = belts.reduce((sum, belt) => sum + belt.earned, 0);
  return {
    belts,
    phases,
    earned,
    total: belts.reduce((sum, belt) => sum + belt.total, 0),
    started: earned > 0,
    next,
    resume: resumeAt(course, phases, next?.phase),
  };
}

// The first lesson of the phase the student is in, or of the course while that
// phase has none. Progress tracking will open the lesson they last had open.
function resumeAt(course: Course, phases: PhaseView[], current: string | undefined) {
  const withLessons = course.phases.filter((phase) => phase.lessons.length > 0);
  const phase = withLessons.find((candidate) => candidate.id === current) ?? withLessons[0];
  const view = phases.find((candidate) => candidate.id === phase?.id);
  return phase && view ? { lesson: phase.lessons[0], phase: view } : null;
}

/** Book chapters as a reader writes them: [1, 2, 3, 5] is "1–3, 5". */
export function chapterRange(chapters: number[]): string {
  const runs: number[][] = [];
  for (const chapter of chapters) {
    const run = runs.at(-1);
    if (run && chapter === (run.at(-1) ?? 0) + 1) run.push(chapter);
    else runs.push([chapter]);
  }
  return runs.map((run) => (run.length > 1 ? `${run[0]}–${run.at(-1)}` : `${run[0]}`)).join(", ");
}
