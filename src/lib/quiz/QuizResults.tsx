import { ChevronDownIcon, CircleCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { correctAnswerText } from "./scoring";
import type { ItemResult, Question, QuizResult } from "./types";

interface QuizResultsProps {
  questions: Question[];
  result: QuizResult;
  onRetake?: () => void;
  onMarkDone?: () => void;
}

// Badge shape (rounded-full, text-xs, font-medium) with our status tints.
const badge =
  "inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap";

function verdict(item: ItemResult) {
  if (item.correct) return { label: "Right", className: "bg-success-muted text-success" };
  if (item.skipped) return { label: "Skipped", className: "border-border text-foreground" };
  return { label: "Wrong", className: "bg-destructive-muted text-destructive" };
}

// Button variant="outline" (default size) until shadcn/ui's Button is added.
const outlineButton =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium whitespace-nowrap shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input";

/**
 * Plain markup shaped like the shadcn/ui components it becomes (docs/design.md):
 * a Card for the score (title, description, actions), a Card of Item rows for
 * the questions with a Badge verdict each, a Collapsible with a link-style
 * Button for the reveal, and an Alert for the correct answer.
 */
export function QuizResults({ questions, result, onRetake, onMarkDone }: QuizResultsProps) {
  const byId = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="results-score"
        className="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 px-6">
          <h2 id="results-score" className="col-start-1 text-3xl font-semibold">
            {result.correct} of {result.total} correct
          </h2>
          <p className="col-start-1 text-sm text-muted-foreground">
            Quizzes never block you. Retake it, or mark it done and keep going.
          </p>
          <div className="col-start-2 row-span-2 row-start-1 flex gap-2 self-start">
            <button type="button" className={outlineButton} onClick={() => onRetake?.()}>
              Retake quiz
            </button>
            <button type="button" className={outlineButton} onClick={() => onMarkDone?.()}>
              Mark as done
            </button>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="results-questions"
        className="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm"
      >
        <h3 id="results-questions" className="px-6 text-xl font-semibold">
          Questions
        </h3>
        <ol className="flex flex-col divide-y px-6">
          {result.items.map((item) => {
            const question = byId.get(item.id);
            if (!question) return null;
            const v = verdict(item);
            return (
              <li key={item.id} className="flex flex-col gap-2.5 py-3">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="flex w-16 shrink-0">
                    <span className={cn(badge, v.className)}>{v.label}</span>
                  </span>
                  <p>{question.prompt}</p>
                </div>
                {!item.correct && (
                  <details className="ml-20">
                    <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Show correct answer
                      <ChevronDownIcon aria-hidden="true" className="size-4" />
                    </summary>
                    <div className="mt-2 grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 rounded-lg border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
                      <CircleCheckIcon aria-hidden="true" className="row-span-2 mt-0.5 size-4" />
                      <p className="col-start-2 font-medium tracking-tight">
                        {correctAnswerText(question)}
                      </p>
                      {question.explanation && (
                        <p className="col-start-2 text-muted-foreground">{question.explanation}</p>
                      )}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
