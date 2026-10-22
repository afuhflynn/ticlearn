"use client";

import { Check, CircleDashed, TriangleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProcessStage {
  /** The value the database holds for this stage. */
  value: string;
  /** The name the student reads. */
  label: string;
}

export interface ProcessProgressProps {
  /**
   * The stage the pipeline is in, or null when the pipeline has not started.
   * The stage is written by the background job, so the interface and the
   * database can never disagree about where the work is.
   */
  stage: string | null;
  /**
   * The ordered list of stages. The same list the enum order describes, so the
   * step count out of the total is a real number and not a decoration.
   */
  steps: ProcessStage[];
  /** True when the pipeline failed. The stage it failed in stays on screen. */
  failed?: boolean;
  className?: string;
}

/**
 * A process is never a skeleton. It gets a bar with a real number where the
 * byte count or the step count is known, and the names of its stages where it
 * is not.
 */
function ProcessProgress({
  stage,
  steps,
  failed = false,
  className,
}: ProcessProgressProps) {
  const reduceMotion = useReducedMotion();

  const currentIndex = stage ? steps.findIndex((s) => s.value === stage) : -1;
  const step = currentIndex >= 0 ? currentIndex + 1 : 0;
  const total = steps.length;
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;

  return (
    <div
      data-slot="process-progress"
      data-stage={stage ?? "idle"}
      data-failed={failed ? "true" : "false"}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">
            {failed
              ? "Stopped partway"
              : currentIndex >= 0
                ? steps[currentIndex].label
                : "Getting ready"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {step > 0 ? `Step ${step} of ${total}` : `0 of ${total}`}
          </span>
        </div>
        <Progress
          value={failed ? percent : percent}
          aria-label={failed ? "Stopped partway" : "Progress"}
          className={cn("h-1.5", failed && "[&>div]:bg-destructive")}
        />
      </div>

      <ol
        data-slot="process-stages"
        className="flex flex-col gap-1.5 text-sm text-muted-foreground"
      >
        {steps.map((s, index) => {
          const isDone = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isFailedStage = failed && isCurrent;
          return (
            <li
              key={s.value}
              data-slot="process-stage"
              data-state={
                isFailedStage
                  ? "failed"
                  : isCurrent
                    ? "running"
                    : isDone
                      ? "done"
                      : "waiting"
              }
              className={cn(
                "flex items-center gap-2",
                (isCurrent || isDone) && "text-foreground",
              )}
            >
              {isFailedStage ? (
                <TriangleAlert
                  aria-hidden="true"
                  className="size-4 shrink-0 text-destructive"
                />
              ) : isDone ? (
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
              ) : (
                <CircleDashed
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0",
                    isCurrent && !reduceMotion && "animate-spin",
                  )}
                />
              )}
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export interface ProgressLineProps {
  /** What is happening, in plain words. */
  message: string;
  /** Roughly how long it will take, in plain words. */
  estimate?: string;
  className?: string;
}

/**
 * The plain line. A wait that crosses ten seconds stops pretending to be a
 * shape and says plainly what is happening and roughly how long it will take.
 */
function ProgressLine({ message, estimate, className }: ProgressLineProps) {
  return (
    <output
      data-slot="progress-line"
      className={cn("block text-sm text-muted-foreground", className)}
    >
      {message}
      {estimate ? <span className="text-foreground"> {estimate}</span> : null}
    </output>
  );
}

export { ProcessProgress, ProgressLine };
