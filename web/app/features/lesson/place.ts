// Where a class sits in the course, for the lesson page's breadcrumb.
import { phaseNumber } from "../content/phase";
import type { Course, Lesson } from "../content/types";

export interface LessonPlace {
  /** "Phase 1", or the phase's title outside the numbering. */
  phase: string;
  phaseTitle: string;
  /** "Class 1.2": the phase, then the video's place among the phase's videos. */
  label: string;
}

export function lessonPlace(course: Course, lesson: Pick<Lesson, "phase" | "video">): LessonPlace {
  const phase = course.phases.find((candidate) => candidate.id === lesson.phase);
  const title = phase?.title ?? lesson.phase;
  const number = phaseNumber(lesson.phase);
  if (number === null) return { phase: title, phaseTitle: title, label: title };
  const position = (phase?.videos.indexOf(lesson.video) ?? -1) + 1;
  return { phase: `Phase ${number}`, phaseTitle: title, label: `Class ${number}.${position}` };
}
