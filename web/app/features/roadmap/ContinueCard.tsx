import { TvMinimalPlayIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodeText } from "./CodeText";
import type { NextStripe, Roadmap } from "./roadmap";

interface ContinueCardProps {
  resume: NonNullable<Roadmap["resume"]>;
  next: NextStripe | null;
  started: boolean;
}

/**
 * The lesson to open next, and the stripe the student is working towards.
 * Until progress tracking lands, that's the first lesson of the phase with
 * the next stripe; the video and text progress bars come with it.
 */
export function ContinueCard({ resume: { lesson, phase }, next, started }: ContinueCardProps) {
  const where = [
    phase.number && `Phase ${phase.number}`,
    phase.title,
    phase.chapters && `ch. ${phase.chapters}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section aria-labelledby="continue-title">
      <Card className="gap-6 px-6 md:flex-row md:items-center md:justify-between md:gap-10 md:px-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-primary-muted-foreground">
            {started ? "Continue" : "Start here"}
          </p>
          <h2 id="continue-title" className="text-2xl font-bold">
            {lesson.title}
          </h2>
          <p className="text-muted-foreground">{where}.</p>
          <Button asChild size="lg" className="mt-2 w-fit">
            <Link to={lesson.route}>
              <TvMinimalPlayIcon aria-hidden="true" />
              Open the lesson
            </Link>
          </Button>
        </div>
        {next && (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-background p-4 md:w-80 md:shrink-0">
            <p className="text-xs font-medium text-muted-foreground">
              Stripe {next.number} of {next.of}, {next.belt} belt
            </p>
            <p className="text-sm font-medium">
              <CodeText text={next.text} />
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}
