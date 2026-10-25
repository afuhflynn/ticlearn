"use client";

import {
  isToolOrDynamicToolUIPart,
  type SourceDocumentUIPart,
  type SourceUrlUIPart,
  type UIMessage,
} from "ai";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Decorative, LiveRegion } from "@/components/ui/live-region";
import {
  FALLBACK_ACTIVITY_LABEL,
  SILENT_TOOL_NAMES,
  toolFailureFromName,
  toolLabelFromName,
  toolNameFromPartType,
} from "@/lib/chat/activity-labels";
import { cn } from "@/lib/utils";

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

type ActivityStep = {
  id: string;
  name: string;
  label: string;
  state: string;
  failed: boolean;
  errorText?: string;
};

type ActivitySource = {
  id: string;
  title: string;
  url: string;
};

function toolInputOf(part: unknown): Record<string, unknown> {
  if (!part || typeof part !== "object") return {};
  const input = (part as { input?: unknown }).input;
  return input && typeof input === "object"
    ? (input as Record<string, unknown>)
    : {};
}

function toolNameOf(part: unknown): string {
  const type = (part as { type?: string }).type ?? "";
  if (type === "dynamic-tool") {
    return (part as { toolName?: string }).toolName ?? "dynamic-tool";
  }
  return toolNameFromPartType(type);
}

/** The steps and sources one answer used, in the order the model produced them. */
export function activityFromParts(parts: UIMessage["parts"]): {
  steps: ActivityStep[];
  sources: ActivitySource[];
} {
  const steps: ActivityStep[] = [];
  const sources: ActivitySource[] = [];

  for (const [index, part] of parts.entries()) {
    if (isToolOrDynamicToolUIPart(part)) {
      const name = toolNameOf(part);
      if (SILENT_TOOL_NAMES.has(name)) continue;
      const state = (part as { state?: string }).state ?? "pending";
      const failed = state === "output-error";
      steps.push({
        id: (part as { toolCallId?: string }).toolCallId ?? `${name}-${index}`,
        name,
        label: toolLabelFromName(name, toolInputOf(part)),
        state,
        failed,
        errorText: (part as { errorText?: string }).errorText,
      });
      continue;
    }

    if (part.type === "source-url" || part.type === "source-document") {
      const urlPart = part as SourceUrlUIPart & SourceDocumentUIPart;
      const title =
        (urlPart as SourceUrlUIPart).title ||
        (urlPart as SourceDocumentUIPart).filename ||
        new URL((urlPart as SourceUrlUIPart).url, "https://ticlearn.local")
          .hostname;
      sources.push({
        id: `source-${index}`,
        title: title || "Source",
        url: (urlPart as SourceUrlUIPart).url ?? "",
      });
    }
  }

  return { steps, sources };
}

function ElapsedClock() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // The seconds tick for the eye only. A live region would read them out
  // again every second, which is not what a student waiting wants to hear.
  return <Decorative className="text-xs">{seconds}s</Decorative>;
}

/**
 * A dot that breathes while a step runs. It is not a spinner: the words beside
 * it already name the step, and a spinner would say only that something, at
 * some point, might finish.
 */
function RunningDot() {
  return (
    <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current opacity-70 motion-reduce:animate-none" />
  );
}

export function ActivityBlock({
  parts,
  status,
  durationMs,
}: {
  parts: UIMessage["parts"];
  status: ChatStatus;
  durationMs?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const { steps, sources } = useMemo(() => activityFromParts(parts), [parts]);
  const streaming = status === "submitted" || status === "streaming";
  const runningStep = [...steps].reverse().find((step) => !step.failed);
  const currentLabel =
    streaming && steps.length === 0
      ? FALLBACK_ACTIVITY_LABEL
      : runningStep?.label;

  if (!streaming && steps.length === 0 && sources.length === 0) {
    return null;
  }

  const seconds =
    durationMs === null || durationMs === undefined
      ? null
      : Math.max(1, Math.round(durationMs / 1000));
  const summary = streaming
    ? currentLabel || FALLBACK_ACTIVITY_LABEL
    : seconds
      ? `Thought for ${seconds}s`
      : "Thought";
  const sourceCount = sources.length;

  return (
    <Collapsible
      className="w-full"
      data-slot="activity-block"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="min-h-11 w-full justify-start gap-2 px-0 text-left text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          type="button"
          variant="ghost"
        >
          {streaming ? (
            <RunningDot />
          ) : (
            <CheckIcon className="size-3.5 shrink-0" />
          )}
          <span className="min-w-0 truncate">
            {summary}
            {sourceCount > 0
              ? ` · Read ${sourceCount} source${sourceCount === 1 ? "" : "s"}`
              : ""}
          </span>
          {streaming ? (
            <span className="ml-auto">
              <ElapsedClock />
            </span>
          ) : null}
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              open ? "rotate-180" : "",
              streaming ? "" : "ml-auto",
            )}
          />
        </Button>
      </CollapsibleTrigger>

      {/* One sentence per step, announced when the step changes and never
          again while the clock ticks. */}
      {streaming ? <LiveRegion>{currentLabel ?? ""}</LiveRegion> : null}

      <CollapsibleContent>
        <div className="mt-1 space-y-2 pb-2 pl-5 text-sm">
          {steps.length === 0 ? (
            <p className="text-muted-foreground">No steps to show.</p>
          ) : (
            <ol className="space-y-1.5">
              {steps.map((step) => (
                <li className="text-muted-foreground" key={step.id}>
                  <span className="flex items-start gap-2">
                    {step.failed ? (
                      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    ) : step.state === "output-available" ? (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
                    )}
                    <span className="min-w-0">
                      {step.failed
                        ? toolFailureFromName(step.name)
                        : step.label}
                      {step.failed && step.errorText ? (
                        <details className="group/details mt-1">
                          <summary className="cursor-pointer text-xs underline-offset-2 hover:underline">
                            Technical details
                          </summary>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                            {step.errorText}
                          </pre>
                        </details>
                      ) : null}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {sources.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Sources</p>
              <ul className="space-y-1">
                {sources.map((source) => (
                  <li key={source.id}>
                    <a
                      className="inline-flex items-start gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      href={source.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLinkIcon className="mt-0.5 size-3 shrink-0" />
                      <span className="min-w-0 break-words">
                        {source.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
