"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReadNoticeProps {
  /** The action that tries the read again. */
  onRetry: () => void;
  /** True while the retry is running. */
  isRetrying?: boolean;
  className?: string;
}

/**
 * The notice for a read that failed because the device is offline.
 *
 * The request never reached the server, so the answer was never lost. The
 * student is told plainly that the connection dropped and is offered a retry,
 * and no skeleton and no generic error is shown.
 */
function ConnectionNotice({
  onRetry,
  isRetrying = false,
  className,
}: ReadNoticeProps) {
  return (
    <output
      data-slot="connection-notice"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <WifiOff
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
      <div className="flex-1">
        <p className="font-medium">The connection dropped</p>
        <p className="text-sm text-muted-foreground">
          We could not reach the server, so nothing was lost. Try again when
          your signal is back.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </output>
  );
}

/**
 * The notice for a read that failed for a reason the server named. It sits
 * beside the content that is already on screen, so the student keeps what
 * they were reading.
 */
function ReadFailureNotice({
  onRetry,
  isRetrying = false,
  className,
}: ReadNoticeProps) {
  return (
    <output
      data-slot="read-failure-notice"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex-1">
        <p className="font-medium">This could not be loaded</p>
        <p className="text-sm text-muted-foreground">
          The server did not answer with this content. The rest of the page is
          still here.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </output>
  );
}

export { ConnectionNotice, ReadFailureNotice };
