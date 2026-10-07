import { CheckIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { beltColor } from "./belt-color";
import type { BeltView, StripeState } from "./roadmap";

const STRIPE: Record<StripeState, string> = {
  earned: "bg-foreground",
  next: "bg-primary",
  open: "bg-border",
};

const sentence = (belt: BeltView) =>
  `${belt.name} belt: ${belt.earned} of ${belt.total} ${belt.total === 1 ? "stripe" : "stripes"}` +
  (belt.sealed ? ", earned" : "") +
  (belt.current ? ", you are here" : "");

/**
 * The whole course as one belt (decision D20): the belts joined end to end,
 * each as long as its stripe count, with its stripe bars, name and count. On
 * phones and tablets it stands up, read top down (decision D31).
 *
 * Each item reads as one sentence to screen readers; what's drawn is hidden
 * from them. Below lg, the strip is the first of two columns and as tall as
 * its stripes, or its row if that's taller. From lg on, every part stacks in
 * one column under the mark (the seal or "You are here"), and the count goes
 * under the name, which leaves a four-stripe belt room at 1024px.
 */
export function LongBelt({ belts }: { belts: BeltView[] }) {
  return (
    <ol className="flex flex-col lg:flex-row">
      {belts.map((belt) => (
        <li
          key={belt.id}
          style={{ "--stripes": belt.total } as CSSProperties}
          className="group grid min-w-0 grid-cols-[1.25rem_auto_1fr] content-start gap-x-3 not-first:-mt-px lg:basis-0 lg:grow-(--stripes) lg:grid-cols-1 lg:gap-y-2 lg:not-first:mt-0 lg:not-first:-ml-px"
        >
          <span className="sr-only">{sentence(belt)}</span>
          <span
            aria-hidden="true"
            className="col-start-3 row-start-1 flex h-5 items-center self-end lg:col-start-1 lg:row-start-1 lg:pl-2"
          >
            {belt.sealed && (
              <span className="flex size-4 -rotate-6 items-center justify-center rounded-xs border-2 border-destructive text-destructive">
                <CheckIcon className="size-2.5" strokeWidth={3.2} />
              </span>
            )}
            {belt.current && (
              <span className="text-xs font-bold whitespace-nowrap text-primary-muted-foreground">
                You are here
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            data-slot="strip"
            className={cn(
              "col-start-1 row-span-2 row-start-1 min-h-[calc(var(--stripes)*0.75rem)] border border-border-strong lg:row-span-1 lg:row-start-2 lg:h-6.5 lg:min-h-0",
              "group-first:rounded-tl-sm group-first:rounded-tr-sm group-last:rounded-br-sm group-last:rounded-bl-sm",
              "lg:group-first:rounded-tr-none lg:group-first:rounded-bl-sm lg:group-last:rounded-tr-sm lg:group-last:rounded-bl-none",
              beltColor(belt.id),
            )}
          />
          <span
            aria-hidden="true"
            className="col-start-2 row-start-1 flex items-baseline gap-1.5 self-end text-sm whitespace-nowrap lg:col-start-1 lg:row-start-4 lg:flex-col lg:gap-0 lg:pl-2"
          >
            <span className="font-bold">{belt.name}</span>
            <span className="text-muted-foreground">
              {belt.earned} of {belt.total}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="col-span-2 col-start-2 row-start-2 flex gap-0.75 self-start pt-1.5 lg:col-span-1 lg:col-start-1 lg:row-start-3 lg:px-2 lg:pt-0"
          >
            {belt.stripes.map((stripe, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: stripes are known only by their place in the belt
                key={i}
                className={cn("h-1.25 w-5 rounded-xs lg:w-auto lg:grow", STRIPE[stripe])}
              />
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
