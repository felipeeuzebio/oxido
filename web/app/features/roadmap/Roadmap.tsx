import type { Course } from "../content/types";
import { ContinueCard } from "./ContinueCard";
import { LongBelt } from "./LongBelt";
import { PhaseCards } from "./PhaseCards";
import { type Progress, roadmap } from "./roadmap";

/** The home screen: the Continue card, the long belt and the phases (design.md, "Belts"). */
export function Roadmap({ course, progress }: { course: Course; progress?: Progress }) {
  const view = roadmap(course, progress);
  const first = view.belts.at(0)?.id;
  const last = view.belts.at(-1)?.id;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8 md:px-10 md:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">
          {first && last ? `From ${first} belt to ${last} belt` : course.title}
        </h1>
        <p className="text-muted-foreground">
          {view.earned} of {view.total} stripes earned on {course.project}. Every stripe is one
          group of tests to turn green.
        </p>
      </header>

      {view.resume && <ContinueCard resume={view.resume} next={view.next} started={view.started} />}

      <section aria-labelledby="belts-title" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="belts-title" className="text-xl font-bold">
            Belts
          </h2>
          <p className="text-sm text-muted-foreground">
            Each belt is as long as its stripe count. A stamped seal marks an earned belt.
          </p>
        </div>
        <LongBelt belts={view.belts} />
      </section>

      <section aria-labelledby="phases-title" className="flex flex-col gap-5">
        <h2 id="phases-title" className="text-xl font-bold">
          Phases
        </h2>
        <PhaseCards phases={view.phases} belts={view.belts} />
      </section>
    </div>
  );
}
