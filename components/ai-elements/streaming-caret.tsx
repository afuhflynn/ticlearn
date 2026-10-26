import { cn } from "@/lib/utils";

export interface StreamingCaretProps {
  className?: string;
}

/**
 * The caret that sits at the end of the text while the answer is still being
 * written. It holds steady rather than blinking: a blinking cursor at the end
 * of a paragraph reads as a fault, and the caret only has to say that more
 * text is on the way. It is hidden from assistive technology, because a screen
 * reader should read the answer, not the cursor.
 */
function StreamingCaret({ className }: StreamingCaretProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] rounded-full bg-current",
        className,
      )}
      data-slot="streaming-caret"
    />
  );
}

export { StreamingCaret };
