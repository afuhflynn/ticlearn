/**
 * A cheap cold start signal, from spec 0010.
 *
 * A serverless instance is created fresh on a scale to zero and torn down when
 * idle, and nothing tells us when that happened. What we can see is how much
 * work this instance has already done since its module loaded, so a request that
 * arrives before the instance has warmed is the closest honest proxy we have.
 *
 * The count lives in module state, which is exactly the scope a serverless
 * instance gives us. It resets on a cold start and climbs as the instance warms.
 */

/** Requests an instance is considered cold for, after this it is warm. */
const WARM_AFTER_REQUESTS = 3;

let servedSinceLoad = 0;

/**
 * Record one request against this instance and say whether it was still cold.
 * The first few requests on a fresh instance are the ones a student feels.
 */
export function noteColdStart(): boolean {
  servedSinceLoad += 1;
  return servedSinceLoad <= WARM_AFTER_REQUESTS;
}
