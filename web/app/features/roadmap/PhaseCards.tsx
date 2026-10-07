import { Badge } from "@/components/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { beltColor } from "./belt-color";
import { CodeText } from "./CodeText";
import type { BeltView, PhaseView } from "./roadmap";

function Status({ phase }: { phase: PhaseView }) {
  switch (phase.status) {
    case "done":
      return <Badge variant="success">Done</Badge>;
    case "current":
      return <Badge variant="primary-muted">{phase.earned > 0 ? "In progress" : "Up next"}</Badge>;
    case "todo":
      return <Badge variant="secondary">Not started</Badge>;
    default:
      return null;
  }
}

const stripes = ({ earned, total }: PhaseView) =>
  `${earned > 0 ? `${earned} of ` : ""}${total} ${total === 1 ? "stripe" : "stripes"}`;

/** One card per phase, in course order, the current one outlined in rust. */
export function PhaseCards({ phases, belts }: { phases: PhaseView[]; belts: BeltView[] }) {
  const beltName = new Map(belts.map((belt) => [belt.id, belt.name]));
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {phases.map((phase) => {
        const label = [
          phase.number && `Phase ${phase.number}`,
          phase.chapters && `ch. ${phase.chapters}`,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <li key={phase.id} className="flex">
            <Card
              className={cn(
                "w-full gap-3 py-5",
                phase.status === "current" && "border-2 border-primary",
              )}
            >
              <CardHeader className="gap-1.5 px-5">
                {label && <p className="text-xs text-muted-foreground">{label}</p>}
                <h3 className="text-lg leading-snug font-bold">{phase.title}</h3>
                {phase.status && (
                  <CardAction>
                    <Status phase={phase} />
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="grow px-5 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <CodeText text={phase.summary} />
                </p>
              </CardContent>
              {phase.belt && (
                <CardFooter className="justify-between gap-2 px-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-4 rounded-xs border border-border-strong",
                        beltColor(phase.belt),
                      )}
                    />
                    {beltName.get(phase.belt)} belt
                  </span>
                  <span>{stripes(phase)}</span>
                </CardFooter>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
