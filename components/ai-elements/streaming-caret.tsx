"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export interface StreamingCaretProps {
  className?: string;
}

/**
 * The caret that sits at the end of the text while the answer is still being
 * written. It is hidden from assistive technology, because a screen reader
 * should read the answer, not the cursor.
 */
function StreamingCaret({ className }: StreamingCaretProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      data-slot="streaming-caret"
      aria-hidden="true"
      className={cn(
        "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] rounded-full bg-current",
        className,
      )}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: [1, 0.15, 1],
              transition: { duration: 1, repeat: Infinity },
            }
      }
    />
  );
}

export { StreamingCaret };
