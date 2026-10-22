"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  ConnectionNotice,
  ReadFailureNotice,
} from "@/components/ui/read-notice";
import { cn } from "@/lib/utils";

/**
 * The wait that crosses this many milliseconds stops being a shape and becomes
 * a plain line. The clock is the client's own, counted from the moment the
 * wait began, because a phone with the wrong date would otherwise see the
 * line at the wrong time.
 */
export const LONG_WAIT_MS = 10_000;

/** How long the swap between the shape and the content takes. */
const CROSSFADE_MS = 180;

export interface RefreshBarProps {
  className?: string;
}

/**
 * The thin bar that sits at the top of a region while it refreshes. It is
 * indeterminate on purpose: the student asked for fresh data, not for a
 * number. A reader who has asked for reduced motion gets a still bar, because
 * a bar that travels forever is a repaint that never ends.
 */
function RefreshBar({ className }: RefreshBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      data-slot="refresh-bar"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden",
        className,
      )}
    >
      <motion.div
        className="h-full w-1/3 rounded-full bg-primary"
        initial={reduceMotion ? { opacity: 0.5 } : { x: "-110%" }}
        animate={reduceMotion ? { opacity: 0.5 } : { x: "330%" }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
      />
    </div>
  );
}

export interface PendingRegionProps {
  /**
   * The shape of what is coming, authored next to the screen that uses it. A
   * skeleton is a promise about the shape of the content, so it is only used
   * where that shape is genuinely known.
   */
  fallback: React.ReactNode;
  /** True only while the region has no data at all. */
  isPending: boolean;
  /**
   * True while a request is in flight over data the student already has. A
   * poll the app started on its own is not a refresh and must not set this.
   */
  isRefreshing?: boolean;
  /** The name of the region, for assistive technology. */
  label: string;
  /**
   * The plain line that replaces the shape once the wait passes ten seconds.
   * It says what is happening and roughly how long it will take.
   */
  longWaitMessage: React.ReactNode;
  /**
   * True when the read failed. A failed read shows a plain notice with a
   * retry, never a skeleton and never a generic error.
   */
  isError?: boolean;
  /** True when the failure was a lost connection rather than a server error. */
  isOffline?: boolean;
  /** Tries the read again. */
  onRetry?: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * A region waits, shows its own shape, and keeps what it already had.
 *
 * The rule this carries, in one paragraph: a region that has no data shows the
 * shape of what is coming, at once, as a skeleton; a region that has data
 * keeps it, dims it a little, and shows a thin bar at its top; a spinner is
 * not a loading state anywhere in the student app or the admin console.
 */
function PendingRegion({
  fallback,
  isPending,
  isRefreshing = false,
  label,
  longWaitMessage,
  isError = false,
  isOffline = false,
  onRetry,
  className,
  children,
}: PendingRegionProps) {
  const reduceMotion = useReducedMotion();
  const fadeSeconds = reduceMotion ? 0 : CROSSFADE_MS / 1000;

  const [isLongWait, setIsLongWait] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const wasPending = useRef(isPending);
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // The ten second clock. It starts when the wait starts and it stops when
  // the wait ends.
  useEffect(() => {
    if (!isPending) {
      setIsLongWait(false);
      return;
    }
    const timer = setTimeout(() => setIsLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  // The cross fade. The shape stays on screen for the length of the fade so
  // that the page does not jump when the content lands.
  useEffect(() => {
    const justResolved = wasPending.current && !isPending;
    wasPending.current = isPending;

    if (!justResolved || fadeSeconds === 0) {
      setIsCrossfading(false);
      return;
    }
    setIsCrossfading(true);
    const timer = setTimeout(() => setIsCrossfading(false), CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [isPending, fadeSeconds]);

  const showShape = (isPending || isCrossfading) && !isError;
  const shapeIsOverlay = !isPending;

  if (isError) {
    return (
      <section
        data-slot="pending-region"
        data-state="error"
        aria-label={label}
        className={cn("relative", className)}
      >
        {isOffline ? (
          <ConnectionNotice onRetry={() => onRetry?.()} />
        ) : (
          <ReadFailureNotice onRetry={() => onRetry?.()} />
        )}
      </section>
    );
  }

  return (
    <section
      data-slot="pending-region"
      data-state={isPending ? "pending" : isRefreshing ? "refreshing" : "ready"}
      aria-busy={isPending || isRefreshing || undefined}
      aria-label={label}
      className={cn("relative", className)}
    >
      {isRefreshing && !isPending ? <RefreshBar /> : null}

      {showShape && !isLongWait ? (
        <motion.div
          key="pending-region-shape"
          data-slot="pending-region-shape"
          aria-hidden="true"
          initial={false}
          animate={{ opacity: isPending ? 1 : 0 }}
          transition={{ duration: fadeSeconds, ease: "easeOut" }}
          className={cn(
            shapeIsOverlay && "pointer-events-none absolute inset-0",
          )}
        >
          {fallback}
        </motion.div>
      ) : null}

      {isPending && isLongWait ? (
        <output
          data-slot="pending-region-long-wait"
          className="block text-sm text-muted-foreground"
        >
          {longWaitMessage}
        </output>
      ) : null}

      {isPending ? null : (
        <motion.div
          key="pending-region-content"
          data-slot="pending-region-content"
          initial={hasMounted.current ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: fadeSeconds, ease: "easeOut" }}
        >
          <div
            data-slot="pending-region-dim"
            className={cn(isRefreshing && "opacity-content-dim")}
          >
            {children}
          </div>
        </motion.div>
      )}
    </section>
  );
}

/**
 * True once the wait has passed ten seconds. The clock is the client's own,
 * counted from the moment the wait began.
 */
export function useLongWait(isWaiting: boolean): boolean {
  const [isLongWait, setIsLongWait] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setIsLongWait(false);
      return;
    }
    const timer = setTimeout(() => setIsLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isWaiting]);

  return isLongWait;
}

export { PendingRegion, RefreshBar };
