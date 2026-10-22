import { isNetworkError } from "@/lib/api-client";

/**
 * The state a region needs to draw itself honestly while it waits.
 */
export interface ReadState {
  /** True while the region has no data at all, so it shows its shape. */
  isPending: boolean;
  /**
   * True while a request is in flight over data the student already has. The
   * content stays on screen, dims a little, and a thin bar appears at the top
   * of the region.
   */
  isRefreshing: boolean;
  /** True when the read failed because the connection dropped. */
  isOffline: boolean;
  /** True when the read failed for any other reason. */
  isError: boolean;
  /** The failure, when there was one. */
  error: Error | null;
}

interface QueryLike {
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * The state of one read, in the words a region understands.
 *
 * `isPolling` says the app is refreshing this read on its own schedule. A
 * poll is not the student asking for fresh data, so it dims nothing and
 * shows no bar. A hook that gets this wrong dims the page every three
 * seconds, which is worse than the flash this rule removes.
 */
export function readState(query: QueryLike, isPolling = false): ReadState {
  const error = query.error instanceof Error ? query.error : null;

  return {
    isPending: query.isPending,
    isRefreshing: query.isFetching && !query.isPending && !isPolling,
    isOffline: error ? isNetworkError(error) : false,
    isError: query.isError,
    error,
  };
}
