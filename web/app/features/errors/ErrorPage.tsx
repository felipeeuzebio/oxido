import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Diagnostic } from "./diagnostic";
import panics from "./panics.svg";

interface ErrorPageProps {
  diagnostic: Diagnostic;
  onRetry: () => void;
}

const base = import.meta.env.BASE_URL;

type Variant = "default" | "outline";

/** A blue gutter mark, as rustc draws `-->`, `|` and `=`. */
const gutter = (mark: string) => <span className="text-code-constant">{mark}</span>;

/**
 * Any error in the app: Ferris panicking (the Rust Book's panics.svg) beside
 * the error, printed the way rustc prints a diagnostic, in the lessons' code
 * colors. A missing page leads with the roadmap; a crash leads with trying
 * again, and in development shows its backtrace (docs/design.md, "Errors").
 */
export function ErrorPage({ diagnostic: d, onRetry }: ErrorPageProps) {
  const lines: ReactNode[] = [
    <>
      <span className="font-semibold text-code-fail">{d.code}</span>
      <span className="font-semibold">: {d.message}</span>
    </>,
    <>
      {gutter("  -->")} {d.location}
    </>,
    gutter("   |"),
  ];
  if (d.help)
    lines.push(
      <>
        {gutter("   =")} <span className="font-semibold">help</span>: {d.help}
      </>,
    );
  if (d.note)
    lines.push(
      <>
        {gutter("   =")} <span className="font-semibold">note</span>: {d.note}
      </>,
    );

  const roadmap = (variant: Variant) => (
    <Button key="roadmap" asChild size="lg" variant={variant}>
      <a href={base}>Go to the roadmap</a>
    </Button>
  );
  const retry = (variant: Variant) => (
    <Button key="retry" type="button" size="lg" variant={variant} onClick={onRetry}>
      Try again
    </Button>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 py-12 md:flex-row md:items-start md:gap-12 md:py-16">
      <img
        src={panics}
        alt="Ferris the crab, panicking"
        width={280}
        height={185}
        className="w-56 shrink-0 md:mt-16 md:w-70"
      />
      <div className="flex w-full min-w-0 flex-col gap-5">
        <h1 className="text-4xl font-bold">{d.title}</h1>
        <figure aria-label="Error details" className="m-0">
          <pre className="code whitespace-pre-wrap">
            {lines.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of lines, never reordered
              <Fragment key={i}>
                {i > 0 && "\n"}
                {line}
              </Fragment>
            ))}
          </pre>
        </figure>
        {d.backtrace && (
          <details open className="text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              Backtrace (only in development)
            </summary>
            <pre className="mt-2.5 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {d.backtrace}
            </pre>
          </details>
        )}
        <div className="flex flex-wrap gap-3">
          {d.notFound
            ? [roadmap("default"), retry("outline")]
            : [retry("default"), roadmap("outline")]}
        </div>
      </div>
    </div>
  );
}
